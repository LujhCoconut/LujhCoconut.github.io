# APU_SE.py

## GPU系统的创建

这一段代码创建了一个 GPU 系统，`shader` 代表 GPU 核心。在其中，`n_wf` 表示每个 SIMD 的波前数量，`cu_per_sqc` 指的是每个 SQC（Shader Queue Controller）对应的计算单元数，`clk_domain` 设置了 GPU 的时钟频率和电压。

```python
# shader 是 GPU 的主体
shader = Shader(
    n_wf=args.wfs_per_simd,
    cu_per_sqc=args.cu_per_sqc,
    clk_domain=SrcClockDomain(
        clock=args.gpu_clock,
        voltage_domain=VoltageDomain(voltage=args.gpu_voltage),
    ),
)
```



这段代码基于协议 `GPU_VIPER` 决定是否在 GPU 核心启动或结束内核时执行 acquire/release 操作。对于 `GPU_VIPER` 协议，只在内核启动时执行 acquire 操作。

```python
if buildEnv["PROTOCOL"] == "GPU_VIPER":
    shader.impl_kern_launch_acq = True
    shader.impl_kern_end_rel = False
else:
    shader.impl_kern_launch_acq = True
    shader.impl_kern_end_rel = True
```



这里检查 TLB（翻译后备缓冲区）是否配置为 `perLane` 模式，如果是，`per_lane` 设置为 `True`。

```python
per_lane = False
if args.TLB_config == "perLane":
    per_lane = True
```



这里创建了多个计算单元CU（`ComputeUnit`），每个计算单元有一个唯一的 ID，指定 SIMD 数量和波前大小。`compute_units` 列表储存所有的计算单元。

```python
compute_units = []
for i in range(n_cu):
    compute_units.append(
        ComputeUnit(
            cu_id=i,
            perLaneTLB=per_lane,
            num_SIMDs=args.simds_per_cu,
            wf_size=args.wf_size,
            ...
        )
    )
```



这一段代码为每个 SIMD 分配波前（`Wavefront`），表示并行执行的工作单元，每个波前具有唯一的 `simdId` 和 `wf_slot_id`。

```python
wavefronts = []
for j in range(args.simds_per_cu):
    for k in range(shader.n_wf):
        wavefronts.append(
            Wavefront(simdId=j, wf_slot_id=k, wf_size=args.wf_size)
        )
```



这里将创建的计算单元（CUs）附加到 GPU 的 `shader` 上。

```python
shader.CUs = compute_units
```



## CPU系统的创建

`shader_idx` 表示 GPU 核心的起始索引，`cp_idx` 表示命令处理器的索引。

```python
shader_idx = args.num_cpus
cp_idx = shader_idx + 1
```



这里从参数中获取 CPU 类和内存模式，并检查是否支持 `AtomicSimpleCPU` 和非 `timing` 模式。`AtomicSimpleCPU` 和非 `timing` 模式是不支持的。

```python
CpuClass, mem_mode = Simulation.getCPUClass(args.cpu_type)
if CpuClass == X86AtomicSimpleCPU or CpuClass == AtomicSimpleCPU:
    fatal("AtomicSimpleCPU is not supported")
if mem_mode != "timing":
    fatal("Only the timing memory mode is supported")
```



这一部分代码创建了 CPU 列表，指定每个 CPU 的时钟频率和电压。每个 CPU 都有唯一的 `cpu_id`。

```python
cpu_list = []
for i in range(args.num_cpus):
    cpu = CpuClass(
        cpu_id=i,
        clk_domain=SrcClockDomain(
            clock=args.CPUClock,
            voltage_domain=VoltageDomain(voltage=args.cpu_voltage),
        ),
    )
    cpu_list.append(cpu)
```



## 进程与驱动加载

这里创建了一个 GPU 计算驱动，用于处理 GPU 计算请求，指定 GPU 的类型、图形版本等。

```python
gpu_driver = GPUComputeDriver(
    filename="kfd",
    isdGPU=args.dgpu,
    gfxVersion=args.gfx_version,
    dGPUPoolID=0,
    m_type=args.m_type,
)
```

这一部分创建了一个进程，指定可执行文件、命令和环境变量，同时加载 GPU 驱动。

```python
process = Process(
    executable=executable,
    cmd=[args.cmd] + args.options.split(),
    drivers=[gpu_driver, render_driver],
    env=env,
)
```



为每个 CPU 创建线程，并为每个 CPU 分配工作负载（即之前定义的进程）。

```python
for cpu in cpu_list:
    cpu.createThreads()
    cpu.workload = process
```



## 创建全系统

**CPU切换设置**：当使用“快进”模式时，`switch_cpu_list`存储当前CPU和未来CPU（可能是KVM和仿真模式的切换）之间的映射，用于在仿真过程中切换CPU。

```python
if fast_forward:
    switch_cpu_list = [(cpu_list[i], future_cpu_list[i]) for i in range(args.num_cpus)]
```



**CPU的ISA信息调整**：这段代码将每个CPU的ISA（指令集架构）的`vendor_string`属性设为“M5 Simulator”，以避免在ROCm环境下由于不兼容的字符串而导致错误。

```python
for i, cpu in enumerate(cpu_list):
    for j in range(len(cpu)):
        cpu.isa[j].vendor_string = "M5 Simulator"
```



**创建系统对象**：这里创建了一个`System`对象，定义了CPU列表、内存范围、缓存行大小、内存模式以及系统的工作负载。`workload`代表运行的二进制程序。

```python
system = System(
    cpu=cpu_list,
    mem_ranges=[AddrRange(args.mem_size)],
    cache_line_size=args.cacheline_size,
    mem_mode=mem_mode,
    workload=SEWorkload.init_compatible(executable),
)
```



**KVM支持与系统时钟设置**：如果启用了“快进”模式，且支持KVM（Kernel-based Virtual Machine），则创建KVM虚拟机，并对主CPU的工作负载进行相关设置。

```python
if fast_forward:
    have_kvm_support = "BaseKvmCPU" in globals()
    if have_kvm_support and get_supported_isas().contains(ISA.X86):
        system.vm = KvmVM()
        system.m5ops_base = 0xFFFF0000
        for i in range(len(host_cpu.workload)):
            host_cpu.workload[i].useArchPT = True
            host_cpu.workload[i].kvmInSE = True
    else:
        fatal("KvmCPU can only be used in SE mode with x86")
```



**TLB层次结构配置**

```python
GPUTLBConfig.config_tlb_hierarchy(args, system, shader_idx)
```



**创建Ruby内存系统**: 使用Ruby创建内存系统，并为GPU的DMA（直接内存访问）设备设置端口。

```python
# create Ruby system
system.piobus = IOXBar(
    width=32, response_latency=0, frontend_latency=0, forward_latency=0
)
dma_list = [gpu_hsapp, gpu_cmd_proc]
Ruby.create_system(args, None, system, None, dma_list, None)
system.ruby.clk_domain = SrcClockDomain(
    clock=args.ruby_clock, voltage_domain=system.voltage_domain
)
gpu_cmd_proc.pio = system.piobus.mem_side_ports
gpu_hsapp.pio = system.piobus.mem_side_ports

for i, dma_device in enumerate(dma_list):
    exec("system.dma_cntrl%d.clk_domain = system.ruby.clk_domain" % i)
```



**连接CPU端口到Ruby内存系统**:  每个CPU的缓存端口（icache和dcache）连接到Ruby系统的CPU端口，此外，还创建了中断控制器并将中断信号连接到系统总线。

```python
# attach the CPU ports to Ruby
for i in range(args.num_cpus):
    ruby_port = system.ruby._cpu_ports[i]

    # Create interrupt controller
    system.cpu[i].createInterruptController()

    # Connect cache port's to ruby
    system.cpu[i].icache_port = ruby_port.in_ports
    system.cpu[i].dcache_port = ruby_port.in_ports

    ruby_port.mem_request_port = system.piobus.cpu_side_ports

    # X86 ISA is implied from cpu type check above
    system.cpu[i].interrupts[0].pio = system.piobus.mem_side_ports
    system.cpu[i].interrupts[0].int_requestor = system.piobus.cpu_side_ports
    system.cpu[i].interrupts[0].int_responder = system.piobus.mem_side_ports
    if fast_forward:
        system.cpu[i].mmu.connectWalkerPorts(
            ruby_port.in_ports, ruby_port.in_ports
        )
```



**连接GPU端口到Ruby**: GPU端口的连接方式比较复杂，首先根据计算单元（CU）的数量和配置，确定Ruby系统中的CPU端口索引，然后逐个连接CU的内存端口、SQC（顺序队列缓存）端口和标量端口。

```python
gpu_port_idx = (
    len(system.ruby._cpu_ports)
    - args.num_compute_units
    - args.num_sqc
    - args.num_scalar_cache
)
gpu_port_idx = gpu_port_idx - args.num_cp * 2

# Connect token ports. For this we need to search through the list of all
# sequencers, since the TCP coalescers will not necessarily be first. Only
# TCP coalescers use a token port for back pressure.
token_port_idx = 0
for i in range(len(system.ruby._cpu_ports)):
    if isinstance(system.ruby._cpu_ports[i], VIPERCoalescer):
        system.cpu[shader_idx].CUs[
            token_port_idx
        ].gmTokenPort = system.ruby._cpu_ports[i].gmTokenPort
        token_port_idx += 1

wavefront_size = args.wf_size
for i in range(n_cu):
    # The pipeline issues wavefront_size number of uncoalesced requests
    # in one GPU issue cycle. Hence wavefront_size mem ports.
    for j in range(wavefront_size):
        system.cpu[shader_idx].CUs[i].memory_port[j] = system.ruby._cpu_ports[
            gpu_port_idx
        ].in_ports[j]
    gpu_port_idx += 1

for i in range(n_cu):
    if i > 0 and not i % args.cu_per_sqc:
        print("incrementing idx on ", i)
        gpu_port_idx += 1
    system.cpu[shader_idx].CUs[i].sqc_port = system.ruby._cpu_ports[
        gpu_port_idx
    ].in_ports
gpu_port_idx = gpu_port_idx + 1

for i in range(n_cu):
    if i > 0 and not i % args.cu_per_scalar_cache:
        print("incrementing idx on ", i)
        gpu_port_idx += 1
    system.cpu[shader_idx].CUs[i].scalar_port = system.ruby._cpu_ports[
        gpu_port_idx
    ].in_ports
gpu_port_idx = gpu_port_idx + 1

```



**控制处理器（CP）连接到Ruby** : 对于控制处理器（CP），每个CP也连接到Ruby的指令缓存端口、数据缓存端口以及中断端口。

```python
for i in range(args.num_cp):
    system.cpu[cp_idx].createInterruptController()
    system.cpu[cp_idx].dcache_port = system.ruby._cpu_ports[
        gpu_port_idx + i * 2
    ].in_ports
    system.cpu[cp_idx].icache_port = system.ruby._cpu_ports[
        gpu_port_idx + i * 2 + 1
    ].in_ports
    system.cpu[cp_idx].interrupts[0].pio = system.piobus.mem_side_ports
    system.cpu[cp_idx].interrupts[
        0
    ].int_requestor = system.piobus.cpu_side_ports
    system.cpu[cp_idx].interrupts[
        0
    ].int_responder = system.piobus.mem_side_ports
    cp_idx = cp_idx + 1
```



## CPU-GPU通信

**连接 CPU 和 GPU** 

```python
# CPU rings the GPU doorbell to notify a pending task
# using this interface.
# And GPU uses this interface to notify the CPU of task completion
# The communcation happens through emulated driver.

# Note this implicit setting of the cpu_pointer, shader_pointer and tlb array
# parameters must be after the explicit setting of the System cpu list
if fast_forward:
    shader.cpu_pointer = future_cpu_list[0]
else:
    shader.cpu_pointer = host_cpu
```



## 模拟

**路径重定向** 

* 这里使用 `RedirectPath` 将主机路径（例如 gem5 输出目录下的 `/fs/proc`, `/fs/sys`, `/fs/tmp`）映射到模拟系统的路径 `/proc`, `/sys`, `/tmp`。

* 这些路径重定向允许在模拟中使用实际的文件系统结构。

```python
redirect_paths = [
    RedirectPath(
        app_path="/proc", host_paths=[f"{m5.options.outdir}/fs/proc"]
    ),
    RedirectPath(app_path="/sys", host_paths=[f"{m5.options.outdir}/fs/sys"]),
    RedirectPath(app_path="/tmp", host_paths=[f"{m5.options.outdir}/fs/tmp"]),
]
# 将重定向路径分配给系统，使得模拟器可以访问这些路径。
system.redirect_paths = redirect_paths
```

**模拟初始化**

```python
root = Root(system=system, full_system=False)
```



**GPU硬件拓扑设置**

根据传入的 `args` 参数，设置 GPU 硬件的拓扑结构。

- 如果使用离散 GPU (`dgpu`)，确保 GPU 版本为 `gfx900`，然后创建 Vega 拓扑结构。
- 如果使用 APU，确保 GPU 版本为 `gfx902`，并创建 Raven 拓扑。

```python
if args.dgpu:
    assert args.gfx_version in ["gfx900"], "Incorrect gfx version for dGPU"
    if args.gfx_version == "gfx900":
        hsaTopology.createVegaTopology(args)
else:
    assert args.gfx_version in ["gfx902"], "Incorrect gfx version for APU"
    hsaTopology.createRavenTopology(args)
```



**全局时间频率和最大仿真时间**

```python
m5.ticks.setGlobalFrequency("1THz")
if args.abs_max_tick:
    maxtick = args.abs_max_tick
else:
    maxtick = m5.MaxTick
```



**设置工作计数选项和检查点支持**

设置工作负载计数选项，以支持基准测试中常用的工作项注解。如果尝试使用检查点功能，但此模型不支持，触发错误。

```python
Simulation.setWorkCountOptions(system, args)

if args.checkpoint_dir != None or args.checkpoint_restore != None:
    fatal("Checkpointing not supported by apu model")
```



**初始化模拟和内存映射**

```python
checkpoint_dir = None
m5.instantiate(checkpoint_dir)

host_cpu.workload[0].map(0x10000000, 0x200000000, 4096)
```



**处理退出事件**

当遇到退出指令、用户中断、模拟时间限制或最后线程上下文退出时，打印原因并退出循环。

如果遇到 "checkpoint" 事件，保存当前检查点并退出。

GPU 内核或 GPU Blit 内核完成时，转储并重置统计数据。

在 "workbegin" 或 "workend" 事件发生时，也转储并重置统计数据。

处理未知事件，并继续模拟。

```python
while True:
    if exit_event.getCause() == "m5_exit instruction encountered" or exit_event.getCause() == "user interrupt received" or exit_event.getCause() == "simulate() limit reached" or "exiting with last active thread context" in exit_event.getCause():
        print(f"breaking loop due to: {exit_event.getCause()}.")
        break
    elif "checkpoint" in exit_event.getCause():
        assert args.checkpoint_dir is not None
        m5.checkpoint(args.checkpoint_dir)
        print("breaking loop with checkpoint")
        break
    elif "GPU Kernel Completed" in exit_event.getCause():
        print("GPU Kernel Completed dump and reset")
        m5.stats.dump()
        m5.stats.reset()
    elif "GPU Blit Kernel Completed" in exit_event.getCause():
        print("GPU Blit Kernel Completed dump and reset")
        m5.stats.dump()
        m5.stats.reset()
    elif "workbegin" in exit_event.getCause():
        print("m5 work begin dump and reset")
        m5.stats.dump()
        m5.stats.reset()
    elif "workend" in exit_event.getCause():
        print("m5 work end dump and reset")
        m5.stats.dump()
        m5.stats.reset()
    else:
        print(f"Unknown exit event: {exit_event.getCause()}. Continuing...")

    exit_event = m5.simulate(maxtick - m5.curTick())
```





# 概念解释

## GPU Shader

GPU 的 **shader** 是一种专门为图形处理而设计的小型程序，它负责处理图形渲染中的不同阶段。Shader 通常由 GPU 执行，用于对 3D 场景中的顶点、像素等元素进行计算。不同类型的 shader 用于处理图形管道的不同部分，它们能通过并行计算对图像生成进行高效处理。

### Shader 的主要类型

1. **Vertex Shader（顶点着色器）**：
   - 处理 3D 模型的顶点数据。
   - 负责将物体的顶点从模型空间转换到屏幕空间，执行例如顶点变换、投影、光照计算等操作。
2. **Fragment (Pixel) Shader（片段着色器/像素着色器）**：
   - 处理每个像素的颜色和深度等信息。
   - 负责对纹理映射、光照效果、阴影等进行计算，最终确定每个像素的颜色。
3. **Geometry Shader（几何着色器）**：
   - 处理几何体，如点、线、三角形等，可以生成或修改图元（primitives）。
   - 可用于创建新几何体或对现有几何体进行操作。
4. **Compute Shader（计算着色器）**：
   - 用于执行通用计算任务，而不是特定于图形渲染的任务。
   - 它可以用于物理模拟、图像处理、AI 计算等，充分利用 GPU 的并行计算能力。

### Shader 的工作方式

Shader 通常以并行的方式执行，GPU 的架构使得它能够同时运行数百甚至数千个 shader，能够高效处理图形渲染的复杂计算任务。例如，渲染一幅复杂的图像需要计算每个像素的颜色和亮度，GPU 会并行地运行片段着色器来完成这些计算任务。

### Shader 在 GPU 编程中的作用

- 在编写 GPU 程序时，shader 是关键的一部分。开发人员可以使用高层次着色语言（如 HLSL、GLSL 或 CUDA）来编写 shader 程序，并将其上传到 GPU 以用于处理图形数据。
- 在图形渲染中，shader 提供了灵活性，使开发人员能够定制化地处理光照、材质、阴影和其他视觉效果，生成高度逼真的图像。

### 总结

GPU 的 shader 是一种专用程序，用于图形渲染和计算任务，通过并行处理显著提高图像生成速度。