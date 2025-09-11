# Understanding QEMU [L2.01]

本节内容主要包含：QEMU基本组件

本节QEMU源代码版本： qemu-10.0.3。涉及到的代码文件如下所示

* `main.c`,`system.h`,`runstate.c`,`main-loop.c`,`vl.c`

> 参考文献：
>
> * 《QEMU/KVM源码解析与应用》
>
> `@last_update`: 2025/09/10



"Everying is a file"



## QEMU事件循环机制

在上一节的末尾，其实出现了包括`kvm_fd`,`vm_fd`,`vcpu_fd`在内的各种fd。”一切皆文件“是UNIX/Linux的著名哲学理念。Linux具体文件、设备、网络socket等都可以抽象为文件。内核通过虚拟文件系统VFS抽象出一个统一的界面。Linux通过fd(文件描述符)来访问一个文件，application可以调用select \ poll \ epoll系统调用监听文件变化。

QEMU程序的运行也基于各类文件fd事件，在运行过程中将感兴趣的文件fd添加到监听列表上并定义相应的处理函数。在QEMU主线程中，有一个循环用来处理这些文件fd的事件（如用户的输入、来自VNC的连接，vNIC对应tap设备的收包...）



### 为什么需要事件循环？

QEMU 本质上是一个用户态的虚拟机监控器（VMM），除了 vCPU 执行指令，还需要处理：

* 虚拟设备的 I/O 请求（磁盘、网卡、串口等）

* 定时器回调（比如虚拟时钟、硬件超时）

* 文件描述符事件（tap 接口、socket 通信）

* 管理命令（QMP/QEMU Monitor Protocol）

* VM 的生命周期事件（挂起、恢复、迁移）

这些事件都是异步发生的，因此 QEMU 需要一个 **事件循环机制** 来统一管理。



### glib事件循环机制

QEMU的事件循环机制基于glib (跨平台，C编写的库)。或者说QEMU 的事件循环是基于 **glib** 提供的抽象，但 QEMU 自己实现了一个轻量级的循环框架。

glib 的 **事件循环机制（GMainLoop / GMainContext）** 是 QEMU、GTK 等很多项目的基础。它本质上是一个 **多路事件分发器**，统一处理文件描述符、定时器、空闲任务等事件。

* 基本概念

  * glib 提供了一个 **可移植的事件循环框架**，类似于 `select/poll/epoll` 的封装。
  * 核心目标：统一处理 **I/O 事件**、**定时器事件**、**idle 回调** 等。
  * 主要对象有两个：
    * **GMainContext**：事件循环的上下文，负责保存事件源和调度逻辑。
    * **GMainLoop**：基于 GMainContext 封装的一个循环对象，提供开始/停止循环的 API。

* 事件源（GSource）

  * 所有事件都抽象为 **GSource**：

    * **I/O Source**：文件描述符可读/可写（基于 `GPollFD`）
    * **Timeout Source**：定时器，某个时间点触发
    * **Idle Source**：CPU 空闲时执行
    * **Custom Source**：用户自定义事件源

  * 每个 GSource 有三个函数：

    * `prepare()`：检查是否准备好触发事件

    * `check()`：检测事件是否真的发生

    * `dispatch()`：事件回调执行

    * > 其实还有别的，比如query : 用于获取实际需要调用poll的文件

  * 事件源可以有不同优先级，事件循环通常先处理高优先级事件源

* 工作流程

  * glib 的事件循环本质上是不断执行以下步骤：

  * ```c
    while (g_main_loop_is_running(loop)) {
        // 1. 找到所有活跃的 source，准备事件
        g_main_context_prepare(context, &max_priority);
        // 2. 计算超时时间，调用 poll/epoll/kqueue 等等待事件
        g_main_context_poll(context, timeout, fds);
        // 3. 检查哪些 source 触发
        g_main_context_check(context, max_priority, fds);
        // 4. 分发事件回调
        g_main_context_dispatch(context);
    }
    ```

  * 流程说明：

    * **prepare**：看哪些 source 可能即将触发（例如超时器快到期）。
    * **poll**：阻塞等待 I/O 事件或超时。
    * **check**：确认哪些事件真正发生。
    * **dispatch**：调用对应的回调函数。

![](.\qemu_003_f1.png)

这就是glib事件循环机制的处理流程，应用程序需要做的就是把新的事件源加入到这个处理流程中，glib会负责处理事件源上注册的各种事件。

> 补充问题
>
> Q: 什么是Poll ?
>
> * 狭义的poll
>
>   * 在 Linux/Unix 系统里，**poll** 是一个系统调用，用来等待 **一个或多个文件描述符（fd）** 的事件发生（比如可读、可写、异常）。
>
>   * ```c
>     int poll(struct pollfd *fds, nfds_t nfds, int timeout);
>     ```
>
>     * `fds`：要监听的文件描述符数组，每个 fd 可以指定关心的事件（可读、可写等）。
>     * `nfds`：数组长度。
>     * `timeout`：超时时间（毫秒），`-1` 表示无限等待。
>     * 返回值
>       * 大于 0 ：有事件发生
>       * 等于 0 ：超时
>       * 小于 0 ：出错
>
>   * 比如：
>
>     * ```c
>       struct pollfd fds[2];
>       fds[0].fd = sockfd;
>       fds[0].events = POLLIN;   // 关心是否可读
>       fds[1].fd = timerfd;
>       fds[1].events = POLLIN;   // 关心定时器是否到期
>       
>       int ret = poll(fds, 2, 1000);  // 等待 1 秒
>       if (ret > 0) {
>           if (fds[0].revents & POLLIN) {
>               printf("socket 有数据\n");
>           }
>           if (fds[1].revents & POLLIN) {
>               printf("定时器到期\n");
>           }
>       }
>       ```
>
>     * 这样就能在一个阻塞点同时等待多个事件。
>
> * 广义的poll
>
>   * 在很多事件循环文档里，**poll** 被泛指为 **等待事件** 的阶段，不一定非得是 `poll()` 系统调用，也可能是：
>     * `select()`
>     * `epoll_wait()`（Linux 更高效）
>     * `kqueue()`（BSD / macOS）
>     * `IOCP`（Windows）
>   * glib 事件循环里的 **poll 阶段** 就是：主循环根据所有 GSource 的需要，收集 fd 和超时时间 → 调用 `poll()` 或 `epoll_wait()` → 等待事件发生或定时器超时。
>
> * 一句话解释：“poll”就是 **挂起当前线程，等待一组事件（I/O、定时器等）发生** 的机制；在事件循环中，poll 阶段就是负责阻塞直到事件准备好，然后再进入 dispatch 阶段。dispatch可以调用事件源对应事件的处理函数。



### QEMU中的事件循环

#### 背景知识：tap设备

Q: 什么是tap设备

**TAP 设备**是 Linux 内核里提供的一种**虚拟网络设备**，用于用户态程序和内核网络协议栈之间传递数据，常用于虚拟化（QEMU/KVM、容器）和网络仿真。

一句话理解：TAP 就像一根虚拟网线，一端插在虚拟机（通过 QEMU），另一端插在宿主机内核的网络栈，从而让虚拟机能像真实主机一样收发以太网数据。

Linux 里有两种虚拟网络设备：

> * TUN (network TUNnel)
>   * 面向 **三层（L3，IP 层）**，收发的是 **IP 包**。
>   * 常用于 VPN、隧道协议（比如 OpenVPN）。
> * TAP (network tap)
>   * 面向 **二层（L2，以太网层）**，收发的是 **以太网帧**。
>   * 常用于虚拟机、容器虚拟网卡，因为虚拟机需要完整的以太网接口。
>
> TAP 设备在内核里表现为一个 **虚拟网卡**（比如 `tap0`），但是它不直接连到物理网卡，而是：
>
> * 一端在 **内核网络栈**（表现得像 eth0 一样，可以配置 IP、MAC 地址）。
> * 一端通过 **字符设备文件 `/dev/net/tun`** 暴露给用户空间程序。
>
> 用户空间程序（比如 QEMU、OpenVPN）可以：
>
> - 通过 `read()` 从 TAP 设备拿到 **虚拟网卡收到的以太网帧**；
> - 通过 `write()` 把 **以太网帧写到 TAP 设备**，内核网络栈就会认为这是网卡收来的包

TAP在虚拟化里的作用

在 QEMU/KVM 中：

* 虚拟机的虚拟网卡（比如 e1000、virtio-net）连接到 TAP 设备。

* 当 Guest OS 发送一个以太网帧时 → QEMU 把它写入 TAP → TAP 交给内核网络栈 → 可以通过 bridge 转发到物理网卡，或者转给别的 VM。

* 当外部网络有数据进来 → 通过 bridge 转发到 TAP → QEMU 从 TAP 读出来 → 交给 Guest OS 的网卡设备。

* > 所以 TAP 就是 **虚拟机和宿主机网络世界的桥梁**。



#### 背景知识：QMP

QMP 是 QEMU 提供的一种 **基于 JSON 的控制协议** (QEMU Monitor Protocol)，运行在 **管理平面**。

用来 **控制和管理虚拟机**，比如：

* 启动/停止/挂起/恢复虚拟机

* 创建/删除快照

* 热插拔设备（CPU、内存、磁盘、网卡）

* 查询虚拟机状态（CPU 寄存器、内存使用、块设备 I/O）

**交互方式**：

* 用户（或者管理程序，比如 libvirt、OpenStack）通过 socket 连接 QEMU 的 QMP 接口
* 发送 JSON 命令，QEMU 返回 JSON 格式的结果

> **QMP** 是管理接口（像命令行 API），用来控制虚拟机。



#### 背景知识：VNC

VNC 是一种 **远程桌面协议**（图形界面访问协议），QEMU 可以内置一个 VNC 服务器。

用来 **远程访问虚拟机的显示画面**，就像你坐在虚拟机的显示器前一样。

* 可以看到 Guest OS 的图形界面（比如 BIOS 界面、Linux 桌面、Windows 桌面）
* 可以用鼠标、键盘在远程控制虚拟机

**交互方式**：

* QEMU 作为 VNC Server
* VNC Client（比如 `vncviewer`、`TigerVNC`、`Remmina`）连接上去
* 传输的是像素/键盘/鼠标事件

例子：

```shell
# 启动一个 VM，启用 VNC 服务器在 :1 (5901端口)
qemu-system-x86_64 -hda disk.img -vnc :1

# 然后用 VNC 客户端连接：
vncviewer localhost:1
```

> 可以把 **VNC 理解为“QEMU 提供的远程显示/远程桌面接口”**。用来操作虚拟机的屏幕和输入设备。



#### 注册和处理



![](.\qemu_003_f2.png)

如图所示，QEMU在运行过程中会注册一些感兴趣的事件，设置其对应的处理函数

> 例如，对于VNC来说，会创建一个socket用于监听来自用户的连接，注册其可读事件为`vnc_client_io`,当VNC有连接到来的时候，glib的框架就会调用`vnc_client_io`函数。

图中的例子是注册网卡设备的后端tap设备的收包。收到包后QEMU调用`tap_send`将包路由给虚拟机网卡前端，若虚拟机使用qmp，则在管理界面中当用户发送qmp命令过来之后，glib会调用事先注册的`tcp_chr_accept`来处理用户的qmp命令。



```shell
qemu-system-x86_64 -m 1024 -smp 4 -hda /home/test/test.img --enable-kvm -vnc :0
```

这个命令是启动一个 **QEMU 虚拟机** 的完整示例，表示启动一个 64 位 QEMU 虚拟机，分配 **1GB 内存**、**4 个 vCPU**，硬盘镜像是 `/home/test/test.img`，使用 **KVM 硬件加速**，并且通过 **VNC (5900端口)** 输出显示画面。



再次强调事件循环的意义：

* 让所有关心的事件——无论是 I/O 事件还是定时器事件——都能被及时处理，不会被漏掉或无限等待。



QEMU的main函数早期版本定义在`vl.c`中，现在（`qemu-10.0.3`）定义在`main.c`中，在进行好所有初始化工作后会调用函数main_loop来开始主循环。

具体代码是这样的

```c
int main(int argc, char **argv)
{
    qemu_init(argc, argv);
    bql_unlock();
    replay_mutex_unlock();
    if (qemu_main) { // MacOS特殊情况
        QemuThread main_loop_thread;
        qemu_thread_create(&main_loop_thread, "qemu_main",
                           qemu_default_main, NULL, QEMU_THREAD_DETACHED);
        return qemu_main();
    } else {
        qemu_default_main(NULL); // Linux/Windows 常见路径
        g_assert_not_reached();
    }
}
```

这里的这个`qemu_init`还是定义在`vl.c`当中的

`qemu_default_main()`中的`qemu_main_loop`在`system.h`中申明，在`runstate.c`中实现。

```c
int qemu_main_loop(void)
{
    int status = EXIT_SUCCESS;

    while (!main_loop_should_exit(&status)) {
        main_loop_wait(false);
    }

    return status;
}
```

然后这里的``main_loop_wait`是实现在`main_loop.c`中

> `main_loop_wait`

```c
void main_loop_wait(int nonblocking)
{
	// ......

    timeout_ns = qemu_soonest_timeout(timeout_ns,
                                      timerlistgroup_deadline_ns(
                                          &main_loop_tlg));

    ret = os_host_main_loop_wait(timeout_ns);
    // ......
}
```

QEMU主循环对应的三个函数如图所示，被上述代码中的`os_host_main_loop_wait`包含：

![](.\qemu_003_f3.png)

> 注： 此处第三步写错了，是`glib_pollfds_poll`

```c
static int os_host_main_loop_wait(int64_t timeout)
{
    GMainContext *context = g_main_context_default();
    int ret;

    g_main_context_acquire(context);

    glib_pollfds_fill(&timeout);

    bql_unlock();
    replay_mutex_unlock();

    ret = qemu_poll_ns((GPollFD *)gpollfds->data, gpollfds->len, timeout);

    replay_mutex_lock();
    bql_lock();

    glib_pollfds_poll();

    g_main_context_release(context);

    return ret;
}
```

这段代码也被定义在`main-loop.c`中。

`main_loop_wait`在调用`os_host_main_loop_wait`之前会调用`qemu_soonest_timeout`先计算一个最小timeout值，该值从定时器列表中获取的，表示监听事件的时候最多让主循环阻塞的时间。timeout使得QEMU能够及时处理系统中的定时器到期事件。

> 更通俗地描述：在 QEMU 里，主循环 `main_loop_wait()` 负责处理两类事件（i） I/O事件 （ii）定时器事件（QEMU 设定的虚拟时钟/周期性任务，到达触发时间时需要执行）。
>
> 为了避免 CPU 忙等 （轮询），QEMU 的主循环会调用一个阻塞函数 `os_host_main_loop_wait()`，通常基于 `ppoll() / select() / epoll()`，让线程“睡眠”直到事件到来。
>
> 但问题是：如果只靠 I/O 事件唤醒，**定时器就可能错过触发时间**。所以 QEMU 需要一个 **超时机制 (timeout)** 来保证按时处理定时器。
>
> 所谓 **定时器到期事件**，就是某个定时器设定的时间到了，需要执行对应的回调函数。举几个在 QEMU 里的例子：
>
> * **虚拟时钟 (vm_clock)**：模拟 CPU 指令执行的时钟，定期触发事件来同步 vCPU 与外设。
> * **周期性任务**：比如刷新虚拟机状态、统计性能数据、触发 watchdog、刷新屏幕（VNC/SDL）。
> * **设备模拟定时器**：模拟硬件设备的定时器（如网卡需要周期性发送中断、磁盘控制器定时刷新缓存）。
>
> > 当某个定时器的到期时间 <= 当前虚拟时钟，就会触发“定时器到期事件”，执行对应的 handler。
> >
> > **timeout 的作用** = 限制主循环最多阻塞多久，以便 QEMU 能够及时处理这些定时器事件。



QEMU主循环的一个函数是`glib_pollfds_fill` (定义在`main-loop.c`中)。

* **主要工作**：获取所有需要进行监听的fd，并且计算一个最小的超时时间
  * glib 主循环管理了很多 **事件源 (GSource)**；
  * 每个事件源可能关心一个或多个 **文件描述符 (GPollFD)**；
  * `glib_pollfds_fill()` 会遍历这些事件源，把 fd 都汇总到一个统一的数组中。

```c
static void glib_pollfds_fill(int64_t *cur_timeout)
{
    // 获取默认上下文： glib 的事件循环基于 GMainContext，它管理了所有事件源 (GSource)
    // 这里拿到默认上下文（QEMU 一般就用默认的）
    GMainContext *context = g_main_context_default();
    int timeout = 0;
    int64_t timeout_ns;
    int n;
    
	// 预处理（准备阶段）：通知 glib “我要开始收集 pollfd 了”。
    // max_priority 会返回当前最高优先级事件，用于后续筛选事件。
    g_main_context_prepare(context, &max_priority);

    // 分配 GPollFD 数组
    glib_pollfds_idx = gpollfds->len;
    n = glib_n_poll_fds;
    do {
        GPollFD *pfds;
        glib_n_poll_fds = n;
        g_array_set_size(gpollfds, glib_pollfds_idx + glib_n_poll_fds);
        pfds = &g_array_index(gpollfds, GPollFD, glib_pollfds_idx);
        n = g_main_context_query(context, max_priority, &timeout, pfds,
                                 glib_n_poll_fds);
    } while (n != glib_n_poll_fds);
	
    // 处理超时时间
    if (timeout < 0) {
        timeout_ns = -1;
    } else {
        timeout_ns = (int64_t)timeout * (int64_t)SCALE_MS;
    }
	// 融合 QEMU 自己的定时器
    *cur_timeout = qemu_soonest_timeout(timeout_ns, *cur_timeout);
}
```

* 分配 GPollFD 数组

  * 这段循环在干两件事：

    * 分配存放 pollfd 的数组

      * `gpollfds` 是一个 `GArray`，用来装所有 `GPollFD`（文件描述符 + 关注事件）。

      * `glib_pollfds_idx` 记录当前数组位置。

      * `g_array_set_size()` 动态调整大小，保证能放下所有 fd。

      * > 关于pollfd,linux代码如下
        >
        > ```c
        > struct pollfd {
        >     int   fd;         // 文件描述符，比如 socket、pipe、字符设备
        >     short events;     // 关注的事件类型，比如可读、可写、异常
        >     short revents;    // 实际发生的事件，由 poll() 填写
        > };
        > ```
        >
        > 用于 **多路复用 I/O**：如果有多个 socket、文件、管道，你不想每个都单独阻塞读/写；就把它们都放到一个 `pollfd` 数组里。
        >
        > 系统会：
        >
        > * 阻塞或等待，直到某个 fd 的事件发生或超时；
        > * 返回后，每个 `pollfd.revents` 告诉你哪些 fd 就绪，可以安全操作。

    * 调用 `g_main_context_query()`

      * 这是 glib 的关键函数：它会把当前上下文里所有 `GSource` 的 pollfd 复制到 `pfds` 数组。

      * 同时返回一个 `timeout`，表示“glib 事件源中最近要触发的定时器的超时时间（毫秒）”。

      * > Q? 为什么有 while 循环？
        >
        > * 因为我们一开始可能不知道需要多少个 pollfd。
        > * `g_main_context_query()` 会告诉你“实际需要 n 个”。
        > * 如果 `n != glib_n_poll_fds`，就重新分配，再跑一次，直到数组够大。

* 处理超时时间

  * `timeout` 是 glib 给出的定时器到期时间（单位 ms）。
  * 转换成纳秒 `timeout_ns`。
  * 如果 `timeout < 0`，说明 glib 没有定时器要处理，设成 `-1`（即 poll 可以无限阻塞）。

*  融合 QEMU 自己的定时器

  * QEMU 除了 glib 的定时器，还有自己维护的 **虚拟机定时器**（虚拟时钟、周期任务、设备定时器）。
  * `qemu_soonest_timeout()`会取：`min(glib_timeout, qemu_timeout, 传入的cur_timeout)`
    * 这样最终的 `cur_timeout` 就是 **最早要触发的定时器时间（最大主循环阻塞时间）**。
    * 这个值会传给 `poll()`，确保事件循环不会阻塞太久，能按时醒来处理定时器。



此时就完成了上图的第一步，已经有了所有需要监听的fd了，然后会调用`qemu_mutex_unlock_iothread`释放QEMU大锁（Big QEMU Lock, BQL）。关于BQL将在下一节中介绍。

接着，`os_host_main_loop_wait`函数会调用`qemu_poll_ns`

```c
ret = qemu_poll_ns((GPollFD *)gpollfds->data, gpollfds->len, timeout);
```

该函数在`timer.h`中声明，在`qemu-timer.c`中实现

```c
int qemu_poll_ns(GPollFD *fds, guint nfds, int64_t timeout)
{
#ifdef CONFIG_PPOLL
    if (timeout < 0) {
        return ppoll((struct pollfd *)fds, nfds, NULL, NULL);
    } else {
        struct timespec ts;
        int64_t tvsec = timeout / 1000000000LL;
        /* Avoid possibly overflowing and specifying a negative number of
         * seconds, which would turn a very long timeout into a busy-wait.
         */
        if (tvsec > (int64_t)INT32_MAX) {
            tvsec = INT32_MAX;
        }
        ts.tv_sec = tvsec;
        ts.tv_nsec = timeout % 1000000000LL;
        return ppoll((struct pollfd *)fds, nfds, &ts, NULL);
    }
#else
    return g_poll(fds, nfds, qemu_timeout_ns_to_ms(timeout));
#endif
}
```

它接收三个参数

* `fds`：文件描述符数组（GPollFD，glib 封装的 pollfd）

* `nfds`：数组长度
* `timeout`：等待时间，**纳秒级**，可以是负数（表示无限阻塞）



判断是否使用 `ppoll`

```c
#ifdef CONFIG_PPOLL
```

* 如果系统支持 `ppoll()`（Linux/现代 Unix）就使用它；
* 否则 fallback 到 glib 的 `g_poll()`（glib 封装的 poll，单位是毫秒）。



`qemu_poll_ns`的调用会阻塞主线程，当该函数返回之后

* 要么表示有文件fd上发生了事件
* 要么表示有一个超时

不管怎么样，这都将进入图中的第三步，也就是调用`glib_pollfds_poll`进行事件的分发处理

该函数实现于`main-loop.c`中

```c
static void glib_pollfds_poll(void)
{
    GMainContext *context = g_main_context_default();
    GPollFD *pfds = &g_array_index(gpollfds, GPollFD, glib_pollfds_idx);

    if (g_main_context_check(context, max_priority, pfds, glib_n_poll_fds)) {
        g_main_context_dispatch(context);
    }
}
```

该函数调用了glib框架中的`g_main_context_check`检测事件，然后调用`g_main_context_dispatch`进行了事件的分发。





#### QEMU主循环真正的循环

上面的`main_loop_wait`其实只执行了一次，真正的循环发生在`qemu_main_loop`里。也即是之前提到的在`runstate.c`中提到的代码。返回值是程序退出状态（`EXIT_SUCCESS` 或其他）

```c
int qemu_main_loop(void)
{
    int status = EXIT_SUCCESS;

    while (!main_loop_should_exit(&status)) {
        main_loop_wait(false);
    }

    return status;
}
```

* `main_loop_should_exit(&status)`：判断 QEMU 是否需要退出
  * 例如收到 `Ctrl+C`、虚拟机关闭、崩溃等
  * 如果不退出，返回 `false`，循环继续
* `main_loop_wait(false)`：**一次事件迭代**
  * 填充 fd 数组（I/O + 定时器）
  * 计算超时
  * 阻塞等待事件（`os_host_main_loop_wait()`）
  * 处理就绪事件和定时器



**循环效果**

* 每次循环都会重新收集 **新的事件源**（新注册的 I/O 或定时器）
* 只要事件循环没有退出条件，主循环会 **无限调用 `main_loop_wait()`**
* 因此：
  * 新的 I/O 事件会被下一轮循环捕获并处理
  * 定时器事件会在到期时被触发

```
+-----------------------+
| qemu_main_loop()      |
| while (!exit)         |
|                       |
|   main_loop_wait()    |-----> 收集 fd + timeout
|                       |-----> 阻塞等待 I/O / timeout
|                       |-----> 触发回调
+-----------------------+
循环直到退出条件满足
```

