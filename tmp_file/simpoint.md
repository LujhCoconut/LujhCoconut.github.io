# simpoint



> 在 **gem5** 仿真器中，**SimPoint** 是用于**加速程序模拟**的一种技术，特别是在需要模拟大量指令的场景下，能够显著减少仿真时间。SimPoint 的基本思想是，通过分析程序执行过程中**不同阶段的行为模式**，选择出代表性的“小段代码”来进行仿真，而不必模拟整个程序的运行。这对于像 SPEC CPU 基准测试这样的长时间工作负载非常有用。



## **行为聚类与代表性选择**

SimPoint 会对程序执行的基本块（Basic Blocks，即一系列按顺序执行的指令）进行采样和聚类，将程序执行划分为多个阶段（称为“**相位**”），每个相位代表程序在不同时间段的行为。SimPoint 会从这些相位中选择最具代表性的部分进行仿真，而跳过不具有代表性的部分，从而加快仿真速度。



## **加速仿真**

- **仿真整个程序**通常会非常耗时，特别是在模拟大量复杂指令的情况下。SimPoint 可以有效缩小仿真所需的时间，只模拟一些“关键时刻”，这能在保证精度的前提下，大幅加速仿真。
- 它通过在执行过程中**间隔性地检查和记录基本块的行为**，然后生成能够代表程序整体行为的“SimPoint Checkpoints”，这些检查点代表了程序中典型的行为阶段。



## 主要功能参数

- `--simpoint-profile`: 启用 SimPoint 基本块分析，收集基本块的执行情况，为后续的 SimPoint 分析做准备。
- `--simpoint-interval`: 定义每个 SimPoint 采样的间隔，通常是指令的数量。例如，默认值为 `10000000`，表示每 1000 万条指令为一个采样间隔。
- `--take-simpoint-checkpoints`: 创建 SimPoint 检查点，记录不同阶段的基本块和它们的权重，用于后续的仿真。
- `--restore-simpoint-checkpoint`: 从 SimPoint 检查点恢复仿真，直接从代表性相位进行恢复，而不必从程序开头重新开始。

```shell
build/ARM/gem5.opt --outdir=simpoint-out/test1 configs/hybrid/hbm_se.py --simpoint-profile --simpoint-interval=10000000 --num-cpus=1 --cpu-type=NonCachingSimpleCPU --cpu-clock=2200MHz --mem-type=DDR4_3200_4x16_2 --hbm-type=HBM_1000_4H_1x128 --cmd=tests/test-progs/hello/bin/arm/linux/hello

build/ARM/gem5.opt --outdir=simpoint-out/test1 configs/hybrid/hbm_se.py --simpoint-profile --simpoint-interval=1000 --num-cpus=1 --cpu-type=NonCachingSimpleCPU --cpu-clock=2200MHz --caches --l2cache --l3cache --mem-type=DDR4_3200_4x16_2 --hbm-type=HBM_1000_4H_1x128 --cmd=tests/test-progs/benchmarks/bin/arm/Bubblesort
```

这里最重要的参数之一是`--simpoint-interval`。它基本上是指令数量中 simpoint 的采样频率。 较小的间隔可能更准确，但也可能导致过多不必要的采样点。通常使用 10M 到 1B 的间隔，这取决于程序有多大。注意，如果 simpoint 太小（指 simpoint-interval 太大），可能无法预热内存系统。





## **应用场景**

SimPoint 在仿真中的作用主要体现在：

- **减少仿真时间**：通过选择性地模拟某些程序片段而不是整个程序，特别适用于需要仿真大量指令或长时间工作负载的情况。
- **提高仿真效率**：特别在系统级仿真和架构研究中，能够用较少的计算资源模拟出具有代表性的数据，从而在架构设计和优化中提供足够的参考数据。





## 命令行示例

```shell
./simpoint \
  -loadFVFile /path_to_output/simpoint.bb.gz \
  -maxK 30 \
  -saveSimpoints /path_to_output/simpoint_out \
  -saveSimpointWeights /path_to_output/weight_out \
  -inputVectorsGzipped
```

* `./simpoint`
  - 运行 SimPoint 可执行文件。这个文件是在 `SimPoint/bin` 目录中生成的，它负责分析程序的基本块向量文件并找出最具代表性的相位。

* `-loadFVFile /path_to_output/simpoint.bb.gz`
  - 指定输入的 **基本块向量文件**（Feature Vector File，简称 BBV 文件）。这里的文件路径 `/home/weidong/dev/gem5/simpoint-out/test1/simpoint.bb.gz` 是 BBV 文件的压缩版本，包含程序在执行时各个阶段的基本块执行信息。SimPoint 会读取这个文件来识别程序不同执行阶段的行为模式。

* `-maxK 30`
  - 设置 **最大聚类数量**，即最多将程序的行为分为 30 个不同的相位。SimPoint 使用 K-means 聚类算法来将程序的基本块行为划分为多个阶段，`maxK` 参数决定了最多可以创建多少个相位。通常，K 的值越大，相位的数量也会增加，但计算开销也会随之上升。

* `-saveSimpoints /path_to_output/simpoint_out`
  - 将 **SimPoint 信息** 保存到指定的文件中。`simpoint_out` 文件将包含选择的代表性相位（SimPoints），这些相位是程序执行过程中最具代表性的时刻，用于后续的精简仿真。

* `-saveSimpointWeights /path_to_output/weight_out`
  - 保存 **SimPoint 权重** 到指定的文件中。`weight_out` 文件记录了每个代表性相位在整个程序执行过程中的权重，表明每个相位占整个程序执行时间的比例。这对于加权分析和评估仿真结果的准确性非常重要。

* `-inputVectorsGzipped`
  - 告诉 SimPoint 输入的 BBV 文件是 **gzip 压缩格式**，即 `.bb.gz` 格式。这个参数确保 SimPoint 能够正确解压缩并读取输入文件。