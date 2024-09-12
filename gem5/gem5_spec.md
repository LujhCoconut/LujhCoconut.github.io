# gem5 运行 SPEC CPU 2017

## SE模式



## FS模式

### 示例代码1

**参见`configs/example/gem5_library`**

> X86主板被硬编码3GB，限制了内存大小

#### 参数解析

```python
parser = argparse.ArgumentParser(
    description="An example configuration script to run the \
        SPEC CPU2017 benchmarks."
)
# 参数定义和解析
args = parser.parse_args()
```

这段代码定义并解析命令行参数，如 `--image`（磁盘镜像路径）、`--benchmark`（要运行的基准测试程序）、`--size`（测试规模）等。通过这些参数，用户可以在运行脚本时自定义模拟的详细配置。



#### 磁盘镜像路径检查

```python
if args.image[0] != "/":
    args.image = os.path.abspath(args.image)

if not os.path.exists(args.image):
    warn("Disk image not found!")
    fatal(f"The disk-image is not found at {args.image}")
```

这段代码确保用户输入的磁盘镜像路径是绝对路径，并检查该路径是否存在。如果镜像不存在，则输出警告并终止程序。



#### 系统组件设置

```python
cache_hierarchy = MESITwoLevelCacheHierarchy(
    l1d_size="32kB",
    l1d_assoc=8,
    l1i_size="32kB",
    l1i_assoc=8,
    l2_size="256kB",
    l2_assoc=16,
    num_l2_banks=2,
)

memory = DualChannelDDR4_2400(size="3GB")

processor = SimpleSwitchableProcessor(
    starting_core_type=CPUTypes.KVM,
    switch_core_type=CPUTypes.TIMING,
    isa=ISA.X86,
    num_cores=2,
)

board = X86Board(
    clk_freq="3GHz",
    processor=processor,
    memory=memory,
    cache_hierarchy=cache_hierarchy,
)
```

这段代码是一个用于在 `gem5` 模拟器上运行 SPEC CPU2017 基准测试的 Python 脚本。脚本负责配置系统的基本组件，如处理器、内存、缓存层次结构等，并启动模拟，以收集在模拟区域 (ROI) 中执行的指令数量及其性能统计信息。以下是对代码的详细解释：

这些代码片段定义了模拟系统的缓存层次结构、内存、处理器和主板：

- `MESITwoLevelCacheHierarchy`: 设置 L1 和 L2 缓存参数。
- `DualChannelDDR4_2400`: 设置双通道 DDR4 内存，大小为 3GB。
- `SimpleSwitchableProcessor`: 设置处理器，它可以从 KVM 核心（用于快速启动 OS）切换到 Timing 核心（用于详细的指令模拟）。
- `X86Board`: 设置 x86 架构的主板，包含 3GHz 的时钟频率。



#### 模拟器设置与运行

```python
def handle_exit():
    print("Done bootling Linux")
    print("Resetting stats at the start of ROI!")
    m5.stats.reset()
    processor.switch()
    yield False  # 继续模拟
    print("Dump stats at the end of the ROI!")
    m5.stats.dump()
    yield True  # 停止模拟

simulator = Simulator(
    board=board,
    on_exit_event={
        ExitEvent.EXIT: handle_exit(),
    },
)

print("Running the simulation")
simulator.run()
```

这部分代码定义了一个 `handle_exit` 函数，处理模拟中的退出事件，如当系统完成启动时，切换处理器核心并重置统计数据。然后，模拟器会运行，并在模拟结束后打印性能统计信息。



#### 输出与性能统计

```python
roi_begin_ticks = simulator.get_tick_stopwatch()[0][1]
roi_end_ticks = simulator.get_tick_stopwatch()[1][1]

print("roi simulated ticks: " + str(roi_end_ticks - roi_begin_ticks))
print(
    "Ran a total of", simulator.get_current_tick() / 1e12, "simulated seconds"
)
print(
    "Total wallclock time: %.2fs, %.2f min"
    % (time.time() - globalStart, (time.time() - globalStart) / 60)
)
```

模拟结束后，脚本会计算并输出 ROI（模拟区域）的时钟周期，以及总的模拟时间和墙时钟时间。这有助于评估基准测试的执行效率和系统性能。