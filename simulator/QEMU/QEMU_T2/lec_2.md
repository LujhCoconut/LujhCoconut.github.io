# Understanding QEMU [L1]

> 参考文献：
>
> * 《QEMU/KVM源码解析与应用》
>
> `@last_update`: 2025/09/10



[**David Wheel**] "All problems in computer science can be solved by another level of indirection"



## About QEMU/KVM

QEMU支持用户程序模拟和系统虚拟化模拟

* 用户程序模拟
  * 使得QEMU能够将为一个平台编译的二进制文件运行在另一个不同的平台。
  * e.g., QEMU通过Tiny Code Generator(TCG)引擎处理一个ARM ISA的二进制程序，能够将其转换为TCG中间代码，随后再转换成目的ISA代码。
* 系统虚拟化
  * 模拟一个完整的系统虚拟机，有自己的虚拟CPU、虚拟内存、虚拟外设......

> 系统虚拟机天生适用于需要按需服务的云计算场景



KVM本身是一个Linux内核模块，导出API到user space。从而user space可以使用这些API创建虚拟机。

* 最开始： KVM只负责核心的CPU虚拟化和内存虚拟化，QEMU作为其用户态组件完成外设的模拟。在当时被称为“QEMU-KVM”
* 现在，QEMU用途已经不是作为一个模拟器了，而是作为以QEMU-KVM为基础的为云计算服务的系统虚拟化软件。



### QEMU/KVM架构

![](.\qemu_kvm_f1.png)

上图是QEMU/KVM的整体架构图

现阶段，简单来说，这个架构图包含三个部分

* 左上方
  * VMX root模式的应用层
* 正下方
  * VMX root模式的内核层
* 右上方
  * VMX non-root模式的虚拟机

> VMX root / non-root 是CPU引入支持硬件虚拟化指令集VT-x之后的概念。
>
> 目前可以把VMX root理解为宿主机，把VMX non-root理解为虚拟机
>
> VMX root / non-root 都有ring 0 到ring 3四个特权级别



**左上方（VMX root模式的应用层）**

* QEMU初始化

  * 创建CPU线程表示虚拟机的CPU执行流
  * 在QEMU的虚拟地址空间中分配空间作为虚拟机的物理地址
  * 根据用户在命令行指定的设备为虚拟机创建对应的虚拟设备

* QEMU运行时

  * 在主线程中监听多种事件

    * 虚拟机对设备的I/O

    * 用户对虚拟机管理界面

    * 虚拟设备对宿主机的I/O事件（虚拟机网络数据的接收）

      * > 这个很好玩

  * QEMU应用层接收事件后调用预定义的函数进行处理



**右上方（VMX non-root模式的虚拟机）**

* 虚拟机本身也有自己的应用层和内核层，在VMX non-root模式下运行
* QEMU/KVM对虚拟机中的操作系统是完全透明的
  * 常用的OS可以不经修改直接运行在VM上
* VM的一个CPU对应QEMU进程中的一个线程
  * 通过QEMU与KVM的协作，这些线程会被宿主机OS调度，直接执行VM中的代码
* VM的物理内存对应QEMU进程中的虚拟内存
  * VM OS有自己的页表管理，完成虚拟机虚拟地址到虚拟机物理地址的转换；虚拟机物理地址经过KVM的页表完成对宿主机物理地址的转换。
* VM的device是QEMU呈现给它的，OS在启动时对device进行设备枚举并加载对应驱动
* 运行中，VM OS通过device的I/O Port (Port IO, PIO)或者MMIO进行交互，KVM截获这个请求，大多数时候KVM会将请求分发到用户空间的QEMU进程中，由QEMU处理这些I/O请求。



**正下方（VMX root模式的内核层）**

实际上是Linux Kernel中的KVM驱动，KVM以misc(杂项)设备驱动的方式存在于内核当中。

* KVM通过“/dev/kvm”导出一系列的接口，QEMU等用户态程序可以通过这些接口控制虚拟机的各个方面
  * CPU个数，内存布局，运行.......
* KVM截获VM产生的VM Exit事件并进行处理



### 组件虚拟化

#### CPU虚拟化

* QEMU创建VM CPU线程，在初始化时设置好相应虚拟CPU寄存器的值
* 调用KVM接口，运行VM，在物理CPU上执行VM的代码
* VM运行时，KVM需要截获VM的敏感指令
  * 当VM的代码是敏感指令或者满足一定的退出条件时，CPU会从VMX non-root模式退出到KVM。 这个事件就是“**VM Exit**”。（类似于用户态执行指令陷入内核一样）。
* VM的退出，首先陷入KVM进行处理
  * 如果KVM无法处理（比如VM写了设备的寄存器地址），KVM会将这个写操作分派到QEMU中进行处理，当KVM/QEMU处理好退出事件后，又可以将CPU置于VMX non-root模式运行虚拟机代码，这个就是“VM Entry”。
* VM就不停进行 **VM Exit** 和 **VM Entry**, CPU会加载对应的宿主机状态或虚拟机状态。KVM使用一个结构来保存VM的VM Exit和VM Entry状态，叫做VMCS。

![](.\qemu_kvm_f2.png)



#### 内存虚拟化

* QEMU在初始化时需要调用KVM的接口向KVM告知VM所需的所有物理内存
* QEMU在初始化时调用`mmap`系统调用分配虚拟内存空间作为虚拟机的物理内存
* QEMU不断更新内存布局的过程中，持续调用KVM接口通知内核KVM模块虚拟机的内存分布
* VM在运行过程中，需要将虚拟机的虚拟地址（GVA,Guest Virtual Address）转换为宿主机的虚拟地址（HVA, Host Virtual Address）,最终转换为宿主机的物理地址（HPA, Host Physical Address）.
  * 在CPU支持EPT(Extended Page Table)之前，VM通过影子页表完成GVA到HPA的转换，是一种软件实现
  * CPU支持EPT之后，CPU会自动完成GVA到HPA的转换
    * VM第一次访问内存时会陷入到KVM，KVM会逐步建立起所谓的EPT页面
    * VM的vCPU在后面访问VM的虚拟内存地址的时候，首先会被转换为虚拟机物理地址，接着会查找EPT页表，然后得到宿主机物理地址。整个过程全部由硬件完成，效率很高。

![](.\qemu_kvm_f3.png)



#### 外设虚拟化

Linux内核代码中最多的代码是设备驱动，相应地，QEMU最多的代码也是设备模拟

* 设备模拟的本质是要为VM提供一个和物理设备接口完全一致的虚拟接口
* VM的OS与设备的数据交互有两种完成方式
  * QEMU and/or KVM
  * 宿主机上对应的后端设备
* QEMU在初始化过程中会创建好模拟芯片组和必要的模拟设备
  * 南北桥芯片，PCIe根总线、ISA根总线等总线系统
  * PCIe设备、ISA设备等
* QEMU的命令行可以指定可选的设备和设备配置项



**三种设备模拟方案**

最早的QEMU的设备模拟是纯软件模拟，无需修改虚拟机内核

* 代价是每一次读写设备寄存器都会陷入KVM，再到QEMU，QEMU再对这些请求进行处理并模拟硬件行为。显然，多次QEMU/KVM介入，效率不高。

随后社区提出了`virtio`

* `virtio`设备是一类特殊的设备，并没有对应的物理设备，需要VM内部OS安装特殊的`virtio`驱动
* `virtio`设备将QEMU变成了半虚拟化方案
  * 因为其本质上修改了虚拟机操作系统内核

`virtio`仍然不能完全满足一些高性能的场景，于是又有了设备直通方案

* 也即是将物理硬件设备直接挂在VM上，VM直接与物理设备交互，尽可能在I/O路径上减少QEMU/KVM的参与
* 与设备直通一起使用的有设备的硬件虚拟化支持技术SRIOV (Single Root I/O Virtualization)
  * SRIOV能够将单个物理设备高效地虚拟出多个虚拟硬件

![](.\qemu_kvm_f4.png)



#### 中断虚拟化

OS通过写设备的I/O端口或MMIO地址与设备交互，设备通过发送中断来通知虚拟操作系统事件。

![](.\qemu_kvm_f5.png)

* QEMU在初始化主板芯片时初始化中断控制器
* QEMU支持单CPU的Intel 8259中断控制器以及SMP的I/O APIC (I/O Advanced Programmable Interrupt Controller)和LAPIC （Local Advanced Programmable Interrupt Controller）中断控制器。

* 传统上，如果虚拟外设像QEMU注入中断，需要先陷入KVM，然后KVM需要向VM注入中断，很耗时。所以KVM也实现了Intel 8250, I/O APIC和LAPIC。用户可以有选择地让QEMU或KVM模拟全部中断控制器，或者各自模拟一部分
* QEMU/KVM一方面需要完成这项中断设备的模拟，另一方面需要模拟中断的请求。



### KVM API

KVM 本质上是一个 **内核驱动**，它通过一组 **ioctl 系统调用** 向用户空间导出 API，用户空间的 VMM（比如 QEMU）通过这些 ioctl 来创建/管理虚拟机和 vCPU。

#### 基本思路

* KVM 内核模块在 `/dev/kvm` 暴露一个字符设备文件。
* 用户空间（VMM）通过 `open("/dev/kvm", O_RDWR)` 获得一个 **kvm fd**。
* 后续所有 KVM 相关的操作都是对这个 fd 或者它派生出的 fd 执行 `ioctl()`。

> 所以 **所有 KVM 的接口都是通过 ioctl 提供的**。

#### ioctl的层次结构

KVM 的 ioctl 可以分为几个层级，每个层级都有对应的 fd：

* **/dev/kvm fd**（系统级别）
  * 操作整个 KVM 子系统。
  * 常见 ioctl：
    * `KVM_GET_API_VERSION`：获取 API 版本。
    * `KVM_CHECK_EXTENSION`：查询 KVM 是否支持某个扩展。
    * `KVM_CREATE_VM`：创建一个虚拟机，返回 vm fd。
* **vm fd**（虚拟机级别）
  * 对某个虚拟机实例的操作。
  * 常见 ioctl：
    * `KVM_CREATE_VCPU`：创建一个 vCPU，返回 vcpu fd。
    * `KVM_SET_USER_MEMORY_REGION`：设置 Guest Physical Memory 映射（即 GPA ↔ HVA 映射关系）。
    * `KVM_IRQ_LINE`：注入中断。
* **vcpu fd**（虚拟 CPU 级别）
  * 对某个 vCPU 的操作。
  * 常见 ioctl：
    * `KVM_RUN`：进入 Guest 模式执行，直到 VM-Exit。
    * `KVM_GET_REGS` / `KVM_SET_REGS`：获取/设置通用寄存器。
    * `KVM_GET_SREGS` / `KVM_SET_SREGS`：获取/设置特殊寄存器（如 CR0, CR3, CR4）。
    * `KVM_INTERRUPT`：注入中断。



#### ioctl 交互流程（以 QEMU 启动 VM 为例）

* QEMU 打开 `/dev/kvm`，调用：

  * ```c
    kvm_fd = open("/dev/kvm", O_RDWR);
    ioctl(kvm_fd, KVM_GET_API_VERSION);
    ```

* 创建 VM：

  * ```c
    vm_fd = ioctl(kvm_fd, KVM_CREATE_VM, 0);
    ```

* 为 VM 分配内存，并告诉 KVM 这块内存的 GPA-HVA 映射：

  * ```c
    ioctl(vm_fd, KVM_SET_USER_MEMORY_REGION, &region);
    ```

* 创建 vCPU：

  * ```c
    vcpu_fd = ioctl(vm_fd, KVM_CREATE_VCPU, vcpu_id);
    ```

* 运行 vCPU（会陷入内核，硬件执行，遇到 VM-Exit 回来）：

  * ```c
    ioctl(vcpu_fd, KVM_RUN, 0);
    ```



#### 设计特点

* **分层清晰**：KVM ioctl 按照 kvm fd → vm fd → vcpu fd 的树状结构组织。
* **最小化内核逻辑**：内核负责 CPU 指令执行和内存映射，设备模拟则交给用户态（QEMU）。
* **高效切换**：`KVM_RUN` 直接进入硬件执行，避免不必要的内核/用户态切换。