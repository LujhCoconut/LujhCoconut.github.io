# Memstrata (OSDI'24)

【Title】Managing Memory Tiers with CXL in Virtualized Environments

【定语描述】the first multi-tenant memory management software stack for hardware-managed tiered memory

## 相关概念

### Multi-Tenancy

在云服务场景下，多租户是指在同一个物理计算资源（如服务器、存储、网络等）上，运行多个逻辑上隔离的租户实例。这些租户共享底层的计算资源，但它们的数据和操作是相互隔离的。租户（`Tenant`）可以是一个组织、一组用户、或者一个应用实例。在云环境中，租户通常是一个客户或用户组，他们使用相同的云服务平台，但在逻辑上是分开的。



### Page Coloring

中文译名 **页着色**

当多个虚拟内存页面映射到相同的缓存行时，可能会发生缓存冲突。这意味着不同的内存页面争用同一缓存行，导致缓存性能下降。`Page Color`是指为每个物理页面分配一个唯一的标识符，以便在缓存映射时考虑缓存行的布局。它用于确保不同的虚拟内存页面不会映射到同一缓存行，从而减少冲突.

在 `page coloring` 机制中，**物理内存被分为若干组，每组的页面具有相同的颜色**。通过将虚拟页面映射到不同颜色的物理页面上，可以避免缓存冲突。`Page Color`的分配通常基于页面的物理地址和缓存的布局。例如，缓存的地址范围可能会被划分为几个区域，每个区域对应一个颜色。

当系统分配新的物理页面时，它会考虑页面的颜色，以确保新页面不会与已存在的页面发生冲突。操作系统或内存管理单元会根据页面颜色策略，分配物理内存页面，从而优化缓存的使用。

> 假设一个计算机系统具有 64 KB 的缓存，并且页面大小为 4 KB。缓存被划分为 16 个缓存组，每个组的大小为 4 KB。在使用 page coloring 时，物理内存页面被分配到不同的缓存组中。通过确保虚拟内存页面映射到不同的缓存组，可以减少缓存冲突。





## Abstract

现有的系统使用在分层内存不同层级之间以页粒度管理数据放置，但在虚拟化环境下，基于软件的设计开销太大。

基于硬件的页面放置策略对应用无感知，进而对性能有一些影响。

这篇文章就想在`Intel Flat Memory`这第一款真实的为`CXL`设计的系统上软硬件结合。它们的实验表明，这个系统的性能和常规的DRAM差不多，对超过82%的`workloads`性能下降不到5%。

对于性能下降最多能达34%的异常workload，文章定义了两个主要的挑战：

* memory contention across tenants 租户**间**的内存争用
* intra-tenant contention due to conflicting access patterns 由于访问模式冲突导致的租户**内**争用

**`Memstrata`**是这篇文章提出的轻量级的多租户内存分配器。它利用`page coloring`**页着色**机制优化VM内的内存争用。它通过使用`online slowdown estimator`分配更多的本地 DRAM以改善对硬件分层敏感的虚拟机的性能。



## Introduction

分层内存就很简单，一个主要管容量，一个主要是性能好一点，概念上一个称为`capacity tier`，另一个被称为`performance tier`。在`CXL-Based DRAM/NVM`+`DRAM`的系统中，`CXL-Based DRAM/NVM`主要是延迟会高一些，因此在这里就是`capacity tier`，而DRAM是`performance tier`。

软件层面的数据管理主要关注的就是冷热（访问的频繁程度），为了识别这些冷热数据，就要么是进行一些页表管理的操作、要么是使用一些采样工具。这样有一些显然的缺陷以至于`general-purpose`的云环境不喜欢使用：

* （据本文所说，未考证）VMs不支持指令采样 并且存在隐私问题（为什么不引用论文让我看看是什么隐私问题）

* 细粒度的页表操作会消耗大量CPU时间（性能下降，IPC下降）
* 相同的页里有的块冷，有的热，还需要考虑新的机制和策略。这样的问题在使用更大页面以减小开销的`hypervisors`来说问题更大。

然后就引入硬件管理的CXL层，结合软件管理的多租户隔离。

这里提到一点就是以前有过的异构内存模式 2LM 模式 ，也就是`Cache`模式，CXL并不支持。也就是DRAM可以做`NVM`的`Cache`但是不可以做`CXL-Based DRAM/NVM`的`Cache`。

除了Abstract介绍的观测，本文还注意到：**虚拟机在同一服务器上被简单地共置时，它们可能会通过“窃取”彼此的本地 DRAM 互相干扰**

然后就基于此提出**`the first multi-tenant memory management software stack for hardware-managed tiered memory`** 修饰的`Memstrata`。

* `Memstrata `通过识别具有冲突缓存行的页面，使用页面着色技术将这些页面分配给同一个虚拟机，从而防止虚拟机间的干扰

* `Memstrata `利用轻量级的在线慢速估算器`online slowdown estimator`来评估每个虚拟机因分层内存未命中所产生的开销。它动态地在虚拟机之间分配专用的本地内存页面，以提高对内存延迟最敏感的虚拟机的性能。