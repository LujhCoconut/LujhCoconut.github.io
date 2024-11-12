# Understanding Cache System Simulation in zSim

[参考] Ziqi Wang : [Understanding Cache System Simulation in zSim](https://wangziqi2013.github.io/article/2019/12/25/understand-zsim-cc-sim.html)

## Introduction

zSim 是一个快速的处理器仿真器，用于建模内存子系统的行为。zSim 基于 PIN，一个二进制插桩工具，允许程序员在运行时插入指令并调用自定义函数。模拟的应用程序在本地硬件上执行，zSim 仅在执行过程中的某些特定时刻施加有限的控制（例如特殊指令、基本块边界等）。本文不会详细描述 zSim 在插桩层面如何工作。相反，我们将 zSim 缓存子系统的实现与仿真器的其他部分隔离开来，详细阐述模拟缓存的架构以及时序是如何计算的。有关 zSim 的更多信息，请参考原始论文，该论文详细描述了模拟器的整体框架。此外，在不明确的情况下，阅读官方源代码总是最佳实践。在接下来的章节中，我们将在讨论源代码时使用上述官方源代码的 GitHub 仓库作为参考。



## Source Files

下面是我们将要讨论的项目 `/src/` 目录下的源代码文件列表。为了方便读者，每个文件我们也列出了其重要的类和声明。值得注意的一点是，文件名并不总是使用文件内定义的类的名称。如果不确定某个类的定义位置，只需执行 `grep -r "class ClsName"` 或 `grep -r "struct ClsName"`，大多数情况下就能找到答案。

| File Name (only showing headers) | Important Modules/Declarations                               |
| :------------------------------: | ------------------------------------------------------------ |
|        memory_hierarchy.h        | Coherence messages and states declaration, BaseCache, MemObject, MemReq |
|          cache_arrays.h          | Tag array organization and operations                        |
|             cache.h              | Actual implementation of the cache class, and cache operations |
|        coherence_ctrls.h         | MESI coherence state machine and actions                     |
|         repl_policies.h          | Cache replacement policy implementations                     |
|              hash.h              | Hash function defined to map block address to sets and to LLC partitions |
|              init.h              | Cache hierarchy and parameter initialization                 |

请注意，zSim 实际上提供了几种不同的缓存实现，可以通过编辑配置文件来选择。最基本的缓存实现位于 `cache.h` 文件中，它定义了一个工作缓存的基本时序和操作，仅此而已。另一个更详细的实现叫做 `TimingCache`，它添加了一个织造阶段的时序模型，用于模拟缓存标签的竞争（zSim 在运行模拟程序的短时间间隔后，在单独的阶段模拟共享资源竞争，假设路径更改干扰是罕见的）。在本文中，我们重点讨论缓存子系统的功能和架构，而不是详细的时序模型和离散事件仿真。为此，我们仅讨论基本的缓存模型，时序的讨论留待后续。



## Cache Interface

在本节中，我们将讨论缓存子系统的接口。在 zSim 中，所有的内存对象，包括缓存和内存，必须继承自虚基类 `MemObject`，其中仅包含一个简洁的接口，即 `access()`。`access()` 调用接受一个 `MemReq` 对象作为参数，该对象包含了内存请求的所有参数。基类缓存的 `access()` 调用返回操作的完成时间，假设没有争用（如果未模拟争用，那么返回的就是实际的完成时间，正如在我们的情境中一样）。

缓存对象也继承自基类 `BaseCache`，而 `BaseCache` 本身继承自 `MemObject`，并定义了另一个接口调用 `invalidate()`。这个函数调用不接受 `MemReq` 作为参数，而是接受行的地址、失效类型和一个布尔标志指针，用于指示给调用方该失效行是否是脏的（因此需要写回到下一级缓存）。请注意，在 zSim 中，`invalidate()` 调用**只会使当前缓存对象中的块失效，并通过布尔标志指示给调用方失效是否引发了写回。因此，调用方有责任使用 `PUTX` 事务将脏块写回到下一级缓存**（我们将在下面看到）。`invalidate()` 的返回值也是操作的响应时间。

总体而言，zSim 中的缓存对象接口相当简单：`access()` 实现了缓存如何处理来自上层的读写请求，而 `invalidate()` 实现了缓存如何处理来自处理器或下层的失效请求（取决于缓存对象在层次结构中的位置）。这两个方法都是阻塞的：调用时以绝对周期号的形式传入开始时间，并返回操作完成时的周期数作为完成时间。

