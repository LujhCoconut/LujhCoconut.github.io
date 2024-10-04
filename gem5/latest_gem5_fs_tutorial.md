# gem5 (v24.0.0.1) Full System Tutorial

以X86为例运行SPECCpu2017的benchmarks

**Notes:**  gem5 最新版本已经废弃`fs.py`的文件



## 文件结构

```
spec_full_system/
  |___ gem5/                                   # gem5 folder
  |
  |___ disk-image/
  |      |___ build.sh                         # the script downloading packer binary and building the disk image
  |      |___ shared/
  |      |___ spec-2017/
  |             |___ spec-2017-image/
  |             |      |___ spec-2017          # the disk image will be generated here
  |             |___ spec-2017.json            # the Packer script
  |             |___ cpu2017-1.1.0.iso         # SPEC 2017 ISO (add here)
  |
  |___ vmlinux-4.19.83                         # Linux kernel, link to download provided below
  |
  |___ README.md
```



### 新建文件夹

```shell
mkdir spec_full_system
```



### CPU ISO

请下载：cpu2017-1.1.0.iso  通过链接：[SPEC CPU® 2017](https://www.spec.org/cpu2017/)  ；或者从其它地方下载。



### gem5 下载

```shell
cd spec_full_system
git clone https://github.com/gem5/gem5.git
```



### disk-image 下载

```shell
cd [专门放资源的目录]
git clone https://github.com/gem5/gem5-resources.git
cd gem5-resources/src/spec-2017/
cp -r disk-image [path_to_<spec_full_system>]/disk-image
```



### 编译gem5 & m5

```shell
cd spec_full_system/gem5
scons build/X86/gem5.opt -j<proc>
```

```shell
# 如果失败遇到scons或者python版本问题
/usr/bin/env python3 $(which scons) build/X86/gem5.opt -j<proc>
```

```shell
cd util/m5
scons build/x86/out/m5
```



### 构建disk-image

```shell
cd spec_full_system/disk-image
./build.sh 
```



### 可能遇到的问题

* QEMU的问题
  * 可能是需要KVM，KVM可能需要更高级别的权限，因此在命令前增加`sudo`，可以解决问题



### 运行

运行脚本如下所示

```shell
build/X86/gem5.opt \
-d fs_dram/perlbench_r \
configs/example/gem5_library/x86-spec-cpu2017-benchmarks.py \
--image ？？？/spec_full_system/disk-image/spec-2017/spec-2017-image/spec-2017 \
--partition 1 \
--benchmark 500.perlbench_r \
--size test \
```

注：`gem5_library`与`common.Options`命令行解析工具不兼容，`Options`里的指令无法使用；在对应文件里

例如： `-I`  `--maxinsts`都是不能被识别的；但是`-d`可以使用；至于如何设置最大指令数或者时钟，后续会写！



## 代码

```python
import argparse
import json
import os
import time

import m5
from m5.objects import Root
from m5.stats.gem5stats import get_simstat
from m5.util import (
    fatal,
    warn,
    addToPath,
)

from gem5.coherence_protocol import CoherenceProtocol
from gem5.components.boards.x86_board import X86Board
from gem5.components.memory import DualChannelDDR4_2400
from gem5.components.processors.cpu_types import CPUTypes
from gem5.components.processors.simple_switchable_processor import (
    SimpleSwitchableProcessor,
)
from gem5.isas import ISA
from gem5.resources.resource import (
    DiskImageResource,
    obtain_resource,
)
from gem5.simulate.exit_event import ExitEvent
from gem5.simulate.simulator import Simulator
from gem5.utils.requires import requires

# We check for the required gem5 build.

requires(
    isa_required=ISA.X86,
    coherence_protocol_required=CoherenceProtocol.MESI_TWO_LEVEL,
    kvm_required=True,
)

# Following are the list of benchmark programs for SPEC CPU2017.
# More information is available at:
# https://www.gem5.org/documentation/benchmark_status/gem5-20

benchmark_choices = [
    "500.perlbench_r",
    "502.gcc_r",
    "503.bwaves_r",
    "505.mcf_r",
    "507.cactusBSSN_r",
    "508.namd_r",
    "510.parest_r",
    "511.povray_r",
    "519.lbm_r",
    "520.omnetpp_r",
    "521.wrf_r",
    "523.xalancbmk_r",
    "525.x264_r",
    "527.cam4_r",
    "531.deepsjeng_r",
    "538.imagick_r",
    "541.leela_r",
    "544.nab_r",
    "548.exchange2_r",
    "549.fotonik3d_r",
    "554.roms_r",
    "557.xz_r",
    "600.perlbench_s",
    "602.gcc_s",
    "603.bwaves_s",
    "605.mcf_s",
    "607.cactusBSSN_s",
    "608.namd_s",
    "610.parest_s",
    "611.povray_s",
    "619.lbm_s",
    "620.omnetpp_s",
    "621.wrf_s",
    "623.xalancbmk_s",
    "625.x264_s",
    "627.cam4_s",
    "631.deepsjeng_s",
    "638.imagick_s",
    "641.leela_s",
    "644.nab_s",
    "648.exchange2_s",
    "649.fotonik3d_s",
    "654.roms_s",
    "996.specrand_fs",
    "997.specrand_fr",
    "998.specrand_is",
    "999.specrand_ir",
]

# Following are the input size.

size_choices = ["test", "train", "ref"]

parser = argparse.ArgumentParser(
    description="An example configuration script to run the \
        SPEC CPU2017 benchmarks."
)


# The arguments accepted are: a. disk-image name, b. benchmark name, c.
# simulation size, and, d. root partition.

# root partition is set to 1 by default.

parser.add_argument(
    "--image",
    type=str,
    required=True,
    help="Input the full path to the built spec-2017 disk-image.",
)

parser.add_argument(
    "--partition",
    type=str,
    required=False,
    default=None,
    help='Input the root partition of the SPEC disk-image. If the disk is \
    not partitioned, then pass "".',
)

parser.add_argument(
    "--benchmark",
    type=str,
    required=True,
    help="Input the benchmark program to execute.",
    choices=benchmark_choices,
)

parser.add_argument(
    "--size",
    type=str,
    required=True,
    help="Sumulation size the benchmark program.",
    choices=size_choices,
)

args = parser.parse_args()
# Options.addCommonOptions(parser)
# Options.addFSOptions(parser)
# options = parser.parse_args()
# We expect the user to input the full path of the disk-image.
if args.image[0] != "/":
    # We need to get the absolute path to this file. We assume that the file is
    # present on the current working directory.
    args.image = os.path.abspath(args.image)

if not os.path.exists(args.image):
    warn("Disk image not found!")
    print("Instructions on building the disk image can be found at: ")
    print(
        "https://gem5art.readthedocs.io/en/latest/tutorials/spec-tutorial.html"
    )
    fatal(f"The disk-image is not found at {args.image}")

# Setting up all the fixed system parameters here
# Caches: MESI Two Level Cache Hierarchy

from gem5.components.cachehierarchies.ruby.mesi_two_level_cache_hierarchy import (
    MESITwoLevelCacheHierarchy,
)

cache_hierarchy = MESITwoLevelCacheHierarchy(
    l1d_size="32kB",
    l1d_assoc=8,
    l1i_size="32kB",
    l1i_assoc=8,
    l2_size="256kB",
    l2_assoc=16,
    num_l2_banks=2,
)
# Memory: Dual Channel DDR4 2400 DRAM device.
# The X86 board only supports 3 GB of main memory.

memory = DualChannelDDR4_2400(size="3GB")

# Here we setup the processor. This is a special switchable processor in which
# a starting core type and a switch core type must be specified. Once a
# configuration is instantiated a user may call `processor.switch()` to switch
# from the starting core types to the switch core types. In this simulation
# we start with KVM cores to simulate the OS boot, then switch to the Timing
# cores for the command we wish to run after boot.

processor = SimpleSwitchableProcessor(
    starting_core_type=CPUTypes.KVM,
    switch_core_type=CPUTypes.TIMING,
    isa=ISA.X86,
    num_cores=2,
)

# Here we setup the board. The X86Board allows for Full-System X86 simulations

board = X86Board(
    clk_freq="3GHz",
    processor=processor,
    memory=memory,
    cache_hierarchy=cache_hierarchy,
)

# SPEC CPU2017 benchmarks output placed in /home/gem5/spec2017/results
# directory on the disk-image. The following folder is created in the
# m5.options.outdir and the output from the disk-image folder is copied to
# this folder.

output_dir = "speclogs_" + "".join(x.strip() for x in time.asctime().split())
output_dir = output_dir.replace(":", "")

# We create this folder if it is absent.
try:
    os.makedirs(os.path.join(m5.options.outdir, output_dir))
except FileExistsError:
    warn("output directory already exists!")

# Here we set the FS workload, i.e., SPEC CPU2017 benchmark
# After simulation has ended you may inspect
# `m5out/system.pc.com_1.device` to the stdout, if any.

# After the system boots, we execute the benchmark program and wait till the
# `m5_exit instruction encountered` is encountered. We start collecting
# the number of committed instructions till ROI ends (marked by another
# `m5_exit instruction encountered`). We then start copying the output logs,
# present in the /home/gem5/spec2017/results directory to the `output_dir`.

# The runscript.sh file places `m5 exit` before and after the following command
# Therefore, we only pass this command without m5 exit.

command = f"{args.benchmark} {args.size} {output_dir}"

# For enabling DiskImageResource, we pass an additional parameter to mount the
# correct partition.

board.set_kernel_disk_workload(
    # The x86 linux kernel will be automatically downloaded to the
    # `~/.cache/gem5` directory if not already present.
    # SPEC CPU2017 benchamarks were tested with kernel version 4.19.83
    kernel=obtain_resource("x86-linux-kernel-4.19.83"),
    # The location of the x86 SPEC CPU 2017 image
    disk_image=DiskImageResource(args.image, root_partition=args.partition),
    readfile_contents=command,
)


def handle_exit():
    print("Done bootling Linux")
    print("Resetting stats at the start of ROI!")
    m5.stats.reset()
    processor.switch()
    yield False  # E.g., continue the simulation.
    print("Dump stats at the end of the ROI!")
    m5.stats.dump()
    yield True  # Stop the simulation. We're done.


simulator = Simulator(
    board=board,
    on_exit_event={
        ExitEvent.EXIT: handle_exit(),
    },
)

# We maintain the wall clock time.

globalStart = time.time()

print("Running the simulation")
print("Using KVM cpu")

m5.stats.reset()

# We start the simulation
simulator.run()

# We print the final simulation statistics.

print("Done with the simulation")
print()
print("Performance statistics:")

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

原生代码没有什么太多需要解析的



### CPU切换

包含两个部分，一个是Linux Booting，一个是Benchmark Simulation

```python
processor = SimpleSwitchableProcessor(
    starting_core_type=CPUTypes.KVM,
    switch_core_type=CPUTypes.TIMING,
    isa=ISA.X86,
    num_cores=2,
)
```

KVM会加快Linux Booting的过程，如果权限不够，脚本前请`sudo`；如果Host不支持KVM，请切换其它CPUType



### 主板

主板大小硬编码3GB，因此内存限制也在3GB；

之前似乎又看到内存溢出部分，可以有额外的处理；但这似乎会影响交叉编址。

```
board = X86Board(
    clk_freq="3GHz",
    processor=processor,
    memory=memory,
    cache_hierarchy=cache_hierarchy,
)
```



### 缓存与内存

无需多言

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
```



### 切换详解

```python
simulator = Simulator(
    board=board,
    on_exit_event={
        ExitEvent.EXIT: handle_exit(),
    },
)
```

正常在`Bootling Linux`结束后就会触发`EXIT`

此时被`on_exit_event`捕获交给`handle_exit()`处理

```python
def handle_exit():
    print("Done bootling Linux")
    print("Resetting stats at the start of ROI!")
    m5.stats.reset()
    processor.switch()
    yield False  # E.g., continue the simulation.
    print("Dump stats at the end of the ROI!")
    m5.stats.dump()
    yield True  # Stop the simulation. We're done.
```

显然这里包含了

* 统计数据重置
* 处理器转换
* 模拟继续
* 模拟中止



到这里`X86`运行`SPEC`的流程就已经大致清楚了 ！



关于模拟的核心实际上就在simulator里，之前提到的最大指令数、最大时钟周期数，都在这里可以找到踪迹！

## Simulator.py

文件路径: `spec_full_system/gem5/src/python/gem5/simulate/simulator.py`

### 最大时钟周期

```python
def set_max_ticks(self, max_tick: int) -> None:
        """Set the absolute (not relative) maximum number of ticks to run the
        simulation for. This is the maximum number of ticks to run the
        simulation for before exiting with a ``MAX_TICK`` exit event.
        """
        if max_tick > m5.MaxTick:
            raise ValueError(
                f"Max ticks must be less than {m5.MaxTick}, not {max_tick}"
            )
        self._max_ticks = max_tick
```

设置最大时钟周期，因此若想在CPU切换后进行模拟，可以对`x86-spec-cpu2017-benchmarks.py`原生代码片段进行如下修改：

```python
def handle_exit():
    print("Done bootling Linux")
    print("Resetting stats at the start of ROI!")
    m5.stats.reset()
    processor.switch()

    max_ticks = 100000000000
    simulator.set_max_ticks(max_ticks)

    yield False  # E.g., continue the simulation.
    print("Dump stats at the end of the ROI!")
    m5.stats.dump()
    yield True  # Stop the simulation. We're done.
```



### 线程最大指令数

任何一个core达到最大指令数，模拟停止

```python
def schedule_max_insts(self, inst: int) -> None:
        """
        Schedule a ``MAX_INSTS`` exit event when any thread in any core
        reaches the given number of instructions.

        :param insts: A number of instructions to run to.
        """
        for core in self._board.get_processor().get_cores():
            core._set_inst_stop_any_thread(inst, self._instantiated)
```

