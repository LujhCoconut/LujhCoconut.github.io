# Understanding Cache System Simulation in zSim

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

总体而言，zSim 中的缓存对象接口相当简单：**`access()` 实现了缓存如何处理来自上层的读写请求，而 `invalidate()` 实现了缓存如何处理来自处理器或下层的失效请求（取决于缓存对象在层次结构中的位置）。这两个方法都是阻塞的：调用时以绝对周期号的形式传入开始时间，并返回操作完成时的周期数作为完成时间。**



## MemReq object

`MemReq` 对象在两种场景下使用。

* 首先，外部组件（例如，模拟的处理器）可能会通过创建一个 `MemReq` 对象来向层级结构发出内存请求，然后调用 `access()` 方法（在 zSim 中，我们还增加了一个 `FilterCache` 级别，在这种情况下，`FilterCache` 对象会发出请求）。调用 `access()` 方法时，需要传递要访问的地址（`lineAddr` 字段）和缓存访问的开始周期（`cycle` 字段）。访问的类型通过初始化 `type` 字段来指定。在这种情况下，不涉及一致性状态，访问类型只能是 `GETS` 或 `GETX`。
* 第二种场景中，上层缓存可能向下层缓存发出请求，以满足在上层处理的请求。例如，当上层缓存将一个脏块逐出到下层缓存时，必须通过创建 `MemReq` 对象并将其设为 `PUTX` 请求来发起缓存写入事务。此外，当请求在上层缓存未命中时，必须创建一个 `MemReq` 对象以从下层缓存中获取块或在其他缓存中降级一致性状态。该过程可以递归进行，直到请求到达持有该块的缓存或具有完全所有权的缓存，可能进一步到达 LLC 甚至 DRAM。

**zSim 中一个有趣的设计决策是，当上层缓存向下层缓存发出请求时，上层缓存中块的一致性状态由下层缓存控制器决定**。这种设计简化了创建“E”状态的过程，因为创建该状态需要下层缓存的信息（即共享向量）。因此，当上层缓存发出请求时，必须向下层缓存传递一个指针，以便下层缓存在处理请求时为块分配一致性状态。此指针存储在 `MemReq` 对象的 `state` 字段中。

另一个不变性是，`MemReq` 对象仅用于上层向下层的请求，如缓存行写回、行提取或一致性失效。而对于下层向上层的请求（如块失效），我们从不使用 `MemReq` 对象。相反，下层缓存直接调用上层缓存的 `invalidate` 方法，可能递归地将失效请求广播到多个上层缓存。

| `MemReq` Field Name | Description                                                  |
| :-----------------: | ------------------------------------------------------------ |
|      lineAddr       | The cache line address to be requested                       |
|        type         | Coherence type of the request, can be one of the GETS, GETX, PUTS, PUTX |
|        state        | Pointer to the requestor’s coherence state. Lower level caches should set this state to reflect the result of processing the request from the upper level |
|        cycle        | Time when the request is issued to the component             |
|        flags        | Hints to lower level caches; Most of them are unimportant to the core functionality of the cache |

请注意，这并不是 `MemReq` 所有字段的完整列表。一些字段（例如`childLock`）专用于并发控制和竞争检测，这部分内容在本文中将不作讨论。为简化说明，我们假设只有单个线程访问缓存层级结构，因此所有状态都是稳定的。实际上，多个线程可能会从不同方向访问同一个缓存对象（例如，上层向下层的行提取，以及下层向上层的失效）。zSim 采用了一个临时锁协议，以确保并发缓存访问始终可以被序列化。



## Cache System Architecture

在本节中，我们讨论 zSim 的缓存系统抽象模型。缓存系统被组织为(**倒立**)树状结构，**根节点代表最后一级缓存（LLC）**，中间节点代表中间层缓存（例如 L2）。在**叶节点层，我们有处理器及其连接的私有 L1d 和 L1i 缓存**。需要注意的是，zSim 并不像通常那样“可视化”缓存层次结构，通常处理器位于顶部，而 LLC 位于底部。这可能会引起一些命名问题，因为我们习惯于将接近叶节点的称为“上层缓存”，而接近根节点的称为“下层缓存”。为避免混淆，在后续讨论中，我们使用**“子缓存”来指代靠近叶节点的缓存，它们通常容量较小且速度较快。我们使用“父缓存”来指代接近根节点的缓存，它们通常容量较大但速度较慢。**

一个缓存对象可以分为多个存储区（bank），每个存储区与其子缓存之间的网络延迟不同。尽管这似乎打破了缓存层次结构的树状抽象，但分区的缓存仍可以视为一个逻辑缓存对象，不影响通用性。分区的父缓存模拟所谓的非一致缓存访问（NUCA），这种机制通常应用于 LLC 以提高并行性，避免不可扩展的单一存储结构。子缓存的访问首先通过一个哈希函数映射到某个存储区，然后分派到父级分区（详见 MESIBottomCC::getParentId）。在 zSim 中，每个分区被视为一个独立的缓存对象，可以通过常规的 access() 接口进行访问。从子缓存到父分区的延迟被存储在网络延迟配置文件中，并在 zSim 初始化时加载。当子缓存访问父级的某个分区时，相应的子到父的延迟值会被加入到总访问延迟中，以模拟 NUCA（详见 MESIBottomCC 类中的 parentRTTs）。

虽然 zSim 支持包容性和非包容性缓存（详见 MESI 控制器中的 nonInclusiveHack 标志），但在以下讨论中，我们假设缓存总是包容性的。包容性缓存的含义是，当一个块在父层失效或被驱逐时，所有持有相同块副本的子缓存也必须将该块失效或回写（如果是脏行），以保持包容性。此外，当子缓存通过请求加载一个块时，该块也必须递归加载到所有父级缓存中。zSim 的作者在代码注释中还建议，非包容性路径未经过充分测试，可能会导致意外行为。

在缓存对象中可能发生三种类型的事件。**第一种是访问（access）**，由处理器或子缓存发出，用于获取缓存行、写回脏行或执行状态降级。访问请求总是通过 `MemReq` 对象包装后发往较低层级的缓存。**第二种是失效（invalidation）**，在当前实现中总是从父缓存发送，用于通知子缓存由于冲突访问或驱逐操作，某些地址不再可以被缓存。需要注意的是，失效请求不使用 `MemReq` 对象，而是通过调用子缓存的 `invalidate()` 方法来传递失效类型（`INV` 表示完全失效，`INVX` 表示降级为共享状态）。**第三种是驱逐（eviction）**，它通常发生在将新块带入缓存时，而当前集合已满。现有块会被驱逐以腾出空间给新块，如果被驱逐的块也存在于至少一个子缓存中，则还会向子缓存发送失效消息。

> 简单地说就是上层（靠近CPU侧）向下层发送`access`，下层可以向上层发送`invalidation`

每个模拟的缓存对象包括

* 一个用于存储地址标签和驱逐信息的标签数组（tag array）
* 一个纯逻辑的替换策略对象
* 一个维持每个块一致性状态和共享向量的一致性控制器对象
* 以及分别用于读取标签数组（`accLat`）和失效块（`invLat`）的访问延迟。

下表列出了 `Cache` 类的所有数据成员及其简要说明。接下来的部分将逐一讨论这些缓存组件。

| `Cache` Field Name | Description                                                  |
| :----------------: | ------------------------------------------------------------ |
|         cc         | Coherence controller; Implements the state machine and shared vector for every cached block |
|       array        | Tag array; Stores the address tags of cached blocks          |
|         rp         | Implements the replacement policy via an abstract interface  |
|      numLines      | Total number of blocks (capacity) of the cache object        |
|       accLat       | Latency for accessing tha tag array, ignoring contention     |
|       invLat       | Latency for invalidating a block in the array, ignoring contention |



## Tag Array

标签数组对象定义在文件 `cache_array.h` 中。标签数组是一维的地址标签数组，可以通过单一索引访问。尽管某些缓存组织可能将数组分为关联集，但仍使用一维数组抽象来识别缓存块。所有标签数组都必须继承自基类 `CacheArray`，该基类提供了三个方法：`lookup()`、`preinsert()` 和 `postinsert()`。

为简化起见，我们假设是集合关联式标签存储，由类 `SetAssocArray` 实现:

```c++
SetAssocArray::SetAssocArray(uint32_t _numLines, uint32_t _assoc, ReplPolicy* _rp, HashFamily* _hf) : rp(_rp), hf(_hf), numLines(_numLines), assoc(_assoc)  {
    array = gm_calloc<Address>(numLines);
    numSets = numLines/assoc;
    setMask = numSets - 1;
    assert_msg(isPow2(numSets), "must have a power of 2 # sets, but you specified %d", numSets);
}
```

在初始化时，构造函数会接收块数和集合数。集合大小通过将缓存行数除以集合数来计算。集合数必须是 2 的幂，以简化标签地址映射。还会计算集合掩码，将哈希函数的结果映射到集合大小减一的范围内。标签数组关联有一个哈希函数，根据块地址计算集合索引。对于集合关联缓存而言，哈希函数相对不重要，因为只执行身份映射（即不更改地址），让集合掩码将块地址映射到集合编号中。对于其他类型的标签数组，如 Z 数组，哈希函数必须是非平凡的，可以通过在配置文件中指定 `array.hash` 进行分配。

* `lookup` 方法返回块在标签数组中的索引，如果找不到则返回 -1。可选地，`lookup` 方法还会根据参数列表中的 `updateReplacement` 标志来更新缓存行的替换元数据。

  ```c++
  uint32_t SetAssocArray::lookup(const Address lineAddr, const MemReq* req, bool updateReplacement) {
      // 计算该地址所在的集合索引（去除低位零）这里的hash实际上返回的就是lineAddr，这个0没什么用
      uint32_t set = hf->hash(0, lineAddr) & setMask;
      // 使用该索引计算集合的起始位置和结束位置
      uint32_t first = set*assoc;
      for (uint32_t id = first; id < first + assoc; id++) {
          if (array[id] ==  lineAddr) {
              if (updateReplacement) rp->update(id, req);
              return id;
          }
      }
      return -1;
  }
  ```

* `preinsert()` 方法在将新地址标签插入标签数组之前调用，此方法将搜索标签数组中的空闲槽位以存储插入的标签。**如果找不到空闲槽位（大多数情况下），则会先将现有槽位清空**，**通过写回当前块数据来腾出空间，并返回其索引**。待写回的地址通过最后一个参数 `wbLineAddr` 返回给调用者，选定槽位的索引则作为返回值。

   ```c++
   uint32_t SetAssocArray::preinsert(const Address lineAddr, const MemReq* req, Address* wbLineAddr) { //TODO: Give out valid bit of wb cand?
       uint32_t set = hf->hash(0, lineAddr) & setMask;
       uint32_t first = set*assoc;
   	// 替换策略对象负责决定当新块被带入集合时，应驱逐哪个块（如果有）。如前所述，替换策略对象存储自己的元数据，可以选择性地在每次标签数组访问时更新。
       uint32_t candidate = rp->rankCands(req, SetAssocCands(first, first+assoc));
   
       *wbLineAddr = array[candidate];
       return candidate;
   }
   ```

  在 `preinsert()` 中，标签数组要么找到一个空槽，要么更可能找到一个将被驱逐的槽位。**这正是替换策略发挥作用的地方**。`preinsert()` 方法首先初始化一个 `SetAssocCands` 对象，它只是一个指示集合开始和结束索引的索引对，然后将该对象传递给替换策略的 `rankCands()` 方法。`rankCands()` 方法返回选定块的索引，并将地址标签一同返回。需要注意的是，`preinsert()` 在决定驱逐时并不知晓块是无效的还是脏的。而一致性控制器则确切知道选定块的状态并将执行正确行为。因此，替换策略在评估块时会查询块的状态以避免驱逐无效块。

* `postinsert()` 实际上将新地址标签存储到目标槽位中，需要地址和槽位索引作为输入。

* ```c++
  void SetAssocArray::postinsert(const Address lineAddr, const MemReq* req, uint32_t candidate) {
      rp->replaced(candidate);
      array[candidate] = lineAddr;
      rp->update(candidate, req);
  }
  ```

  `postinsert()` 的逻辑很简单。替换策略会收到通知，选定块已被置为无效并插入新块。块的元数据将被更新以反映替换操作，新地址也会写入数组中。

需要注意的是，zSim 只保证 `preinsert()` 和 `postinsert()` 不会嵌套，即当前插入操作必须完成后才能执行下一个插入。然而，由于子缓存的写回操作，`lookup()` 可能会在这两个方法之间被调用。例如，当中间层缓存驱逐一个在子缓存中被写脏的块时，`preinsert()` 返回后，缓存控制器处理块的驱逐，会向子缓存发送失效请求。当接收到失效请求时，持有该块脏副本的子缓存会启动写回操作，将脏块直接发送到当前缓存，然后再向其父缓存发起 PUTX 事务。在父缓存的 PUTX 请求过程中，`lookup()` 会被调用以查找槽位以写回脏块。

标签数组声明为名为 `array` 的一维指针。为了访问集合 X，开始索引计算为 `(ways * X)`，结束索引为 `(ways * (X + 1))`。在给定块地址执行数组查找时，首先通过地址与集合掩码进行与操作计算集合编号。注意，所有块地址都已右移以去除低位的零。然后，将集合中的每个地址标签与给定地址进行比较。如果相等，则表示命中并返回标签数组条目的索引，否则返回 -1。如果调用者指明，还会通知替换策略该地址已在命中时被访问。替换策略对象可能根据自身策略（例如移至 LRU 堆栈的末尾）提升命中块。

> 代码中是`uint32_t first = set*assoc;`作为代表，表示的是起始索引。这里提到的`ways`就是代码中的`assoc`。



## Replacement Policy

替换策略实现为一个排名函数。可以通过配置文件中的 `repl.type` 键来指定替换策略。本节仅讨论 LRU（最近最少使用），它由 `LRUReplPolicy` 类实现。**zSim 使用时间戳来实现 LRU**。每次访问标签数组时，都会递增一个全局时间戳。每个块还具有一个本地时间戳，用于存储访问时的全局时间戳值。较大的本地时间戳表示该块更接近于 MRU（最近最常用）位置。

排名函数 `rankCands()`（也称为 `rank()`）遍历 `SetAssocCands` 对象，对于集合中的每个块，它根据 LRU 计数器计算一个分数。如果 LRU 策略是共享者感知的，那么分数将受到以下因素的影响：(1) 块的有效性；(2) 共享者的数量；(3) 本地时间戳的值。分数越高，越不适合驱逐该块。替换策略选择具有最小分数的块作为 LRU 驱逐的候选块。

```c++
uint32_t candidate = rp->rankCands(req, SetAssocCands(first, first+assoc));
```

`call chain` 是  rankCands -> rank

```c++
#define DECL_RANK_BINDING(T) uint32_t rankCands(const MemReq* req, T cands) { return rank(req, cands); }
```

`repl_policy.h`文件

> **`startReplacement()`**
>
> - **作用**：`startReplacement()` 是在缓存替换开始时调用的函数。它指示替换过程的起始，通常用来标识将要插入缓存的行（cache line）。
> - **调用时机**：在替换过程中，首先调用 `startReplacement()` 来准备开始插入一个新的缓存块。
>
>  **`recordCandidate()`**
>
> - **作用**：每次发现一个候选项时，调用 `recordCandidate()` 将该候选项记录下来。候选项通常是当前缓存替换策略评估过程中可能会被替换的缓存块。
> - **调用时机**：在替换过程中，`recordCandidate()` 会在 `startReplacement()` 后被调用，每次找到一个候选项时，就会调用它来记录候选的 ID。
> - **流程**：这个函数会被多次调用，每调用一次，就记录一个候选缓存块的 ID。候选项的确定通常基于当前的替换策略（比如 LRU、LFU 等）。
>
>  **`getBestCandidate()`**
>
> - **作用**：`getBestCandidate()` 用来从已经记录的候选项中选择最佳的缓存块作为驱逐对象。替换策略通常会使用该函数来从候选块中做出选择。
> - **调用时机**：它在 `preinsert()` 阶段调用（即插入新缓存块之前），用于决定哪个缓存块是最不适合的，应该被驱逐。
> - **流程**：通过遍历已记录的候选项（通常是缓存行 ID），根据替换策略的标准（例如，LRU 策略依据最近的访问时间）评选出一个被驱逐的候选块。
>
> **`replaced()`**
>
> - **作用**：`replaced()` 是替换过程完成后调用的函数。当选择了驱逐的缓存块并完成替换后，`replaced()` 会被调用来完成替换操作。
> - **调用时机**：`replaced()` 会在 `postinsert()` 阶段调用，也就是在新缓存块插入后。此时，替换过程已经完成，缓存块已经被替换，可能会进行一些后续处理（比如更新统计信息等）。
> - **流程**：`replaced()` 主要用于处理替换的结果，例如更新访问次数、记录被替换的缓存块等。它是在缓存块插入后调用的。
>
> **`startReplacement()`、`recordCandidate()`、`getBestCandidate()` 的原子性**
>
> - **说明**：注释中指出，`startReplacement()`、`recordCandidate()` 和 `getBestCandidate()` 这三个函数将作为一个原子操作来执行。也就是说，在这些函数执行期间，不会有其他操作（例如 `update()`）干扰这个过程。
> - **原子性保证**：这些函数执行过程中不会发生并发插入，确保了替换过程的完整性和一致性。也就是说，在记录候选块和选择最佳候选块时，不会有其他替换过程的干扰。
>
>  **`update()` 调用**
>
> - **说明**：在 `getBestCandidate()` 和 `replaced()` 之间，可能会有 `update()` 调用。`update()` 可能会影响替换策略的执行，但它不会干扰 `startReplacement()` 到 `getBestCandidate()` 之间的原子操作。这意味着，在选择最佳候选项和替换完成之间，其他操作（如更新）可能会发生。
> - **目的**：`update()` 可能用于一些状态的更新，比如缓存块的访问次数、策略计数等，但它不会打乱替换决策的过程。

```c++
 void startReplacement(const MemReq* req) {
            T::startReplacement(req);
            replCycle = req->cycle;
        }
```

这行代码调用了一个模板类型 `T` 的静态成员函数 `startReplacement`，并将 `req` 作为参数传递进去。这里的 `T` 是一个模板类型，它可能是在类定义时指定的具体类型。`T` 代表一个替换策略类，比如 `LRUReplPolicy` 或其他策略类(`e.g. LFUReplPolicy RandReplPolicy NRUReplPolicy TreeLRUReplPolicy LRUReplPolicy`)。

```c++
        void recordCandidate(uint32_t id) {
            candArray[candIdx++] = id;
        }
```

`recordCandidate` 函数的作用是将每一个候选块的 ID 按顺序记录到 `candArray` 数组中，并通过递增的 `candIdx` 维护数组的索引位置。这是一个用于缓存替换策略中的关键操作，确保候选条目的正确存储，为后续的排名或替换决策提供基础。

```c++
template <typename C> inline uint32_t rank(const MemReq* req, C cands) {
            startReplacement(req);
            for (auto ci = cands.begin(); ci != cands.end(); ci.inc()) {
                recordCandidate(*ci);
            }
            return getBestCandidate();
        }
```



## Simulating Cache Coherence

### Coherence Overview

zSim 使用基于目录的 MESI 状态机实现来模拟 MESI 一致性协议，贯穿整个内存层次结构。zSim 并没有模拟该协议的全部特性，因为仅模拟了稳定状态。zSim 也没有模拟一致性活动所引起的片上网络流量。**网络延迟是静态分配的，并且不会根据网络的利用率而变化**。

**每个缓存对象都有一个一致性控制器，用于维护当前缓存中所有块的一致性状态**。由于 zSim 中的缓存是包含型缓存（inclusive），一致性目录实现为每个缓存块的缓存共享列表，每个缓存块有一个共享列表。每个共享列表中的位数等于子缓存的数量。在该列表中，位上的“1”表示对应的子缓存可能在相同地址上有一个缓存副本，无论是脏块还是干净块。当发送失效请求到子缓存时，会查询共享列表，并在子缓存获取新的块时更新共享列表。

一致性控制器进一步分为两个逻辑部分：“上层控制器”维护目录并向子缓存发送失效请求，“下层控制器”维护缓存块的状态并处理来自子缓存的请求。这两个逻辑部分在实现上基本是独立的，并作为独立模块进行实现。以下表格列出了每个一致性控制器模块的名称和其职责。

| Coherence Module Name | Description                                                  |
| :-------------------: | ------------------------------------------------------------ |
|          CC           | Virtual base class of the controller; Specifies interface of coherence controllers 一致性控制器的虚拟基类；指定一致性控制器的接口 |
|     MESIBottomCC      | Bottom coherence controller; Maintains block states and handles child requests 下层一致性控制器；维护块状态并处理来自子缓存的请求 |
|       MESITopCC       | Top coherence controller; Maintains directory states and handles invalidations 上层一致性控制器；维护目录状态并处理失效请求 |
|        MESICC         | Includes both MESIBottomCC and MESITopCC to implement the coherence controller for non-leaf level caches 包含 MESIBottomCC 和 MESITopCC，用于实现非叶级缓存的一致性控制器 |
|    MESITerminalCC     | Coherence controller for leaf level caches (e.g. L1d, L1i). Only includes MESIBottomCC, since leaf level caches do not have directory states to maintain 叶级缓存的一致性控制器（例如 L1d、L1i）。仅包含 MESIBottomCC，因为叶级缓存不需要维护目录状态 |

我们还列出了 `MESIBottomCC` 类和 `MESITopCC` 类的成员，以帮助我们在接下来的章节中讨论一致性操作。

| `MESIBottomCC` Field Name | Description                                                  |
| :-----------------------: | ------------------------------------------------------------ |
|           array           | The coherence states of cached blocks; States are one of the `M`, `E`, `S`, `I` as in the standard MESI protocol 缓存块的一致性状态；状态为标准 MESI 协议中的 M、E、S、I 之一 |
|          parents          | A list of parent cache partitions. A hash function maps the block address into parent ID when the parent cache is to be accessed. All parent cache partitions collectively maintains state for the entire address space 父缓存分区的列表。当需要访问父缓存时，哈希函数将块地址映射到父缓存 ID。所有父缓存分区共同维护整个地址空间的状态 |
|        parentRTTs         | A list of network latencies to parent partitions; This models NUCA 到父分区的网络延迟列表；用于模拟 NUCA（非统一缓存架构） |
|         numLines          | Number of blocks in the cache. Also number of coherence states 缓存中的块数，也就是一致性状态的数量 |

| `MESITopCC` Field Name | Description                                                  |
| :--------------------: | ------------------------------------------------------------ |
|         array          | The sharer vector of cached blocks. Each entry in the array is a bit vector in which one bit is reserved for each child cache. A boolean flag also indicates whether the block is cached by children caches in exclusive states (used for silent upgrade). 缓存块的共享者向量。数组中的每个条目是一个位向量，其中每一位都为每个子缓存保留一个位。一个布尔标志也表示该块是否被子缓存以独占状态缓存（用于静默升级）。 |
|        children        | A list of children cache objects. Children caches are assumed to be not partitioned, and each child cache maintains state of its own 子缓存对象的列表。假设子缓存没有分区，每个子缓存维护其自身的状态。 |
|      childrenRTTs      | A list of network latencies to children caches; This can model L1i and L1d 到子缓存的网络延迟列表；这可以模拟 L1i 和 L1d 缓存。 |
|        numLines        | Number of blocks in the cache. Also number of directory entries 缓存中的块数，也就是目录条目的数量。 |

zSim 源代码的一个不幸之处是，`MESICC` 类和 `MESITerminalCC` 类的方法与 `MESIBottomCC` 类和 `MESITopCC` 类的方法名称相同，这给导航源代码带来了很大的困难。**一般的经验法则是，`MESICC` 类和 `MESITerminalCC` 类的方法都定义在 `coherence_ctrls.h` 中，而大多数 `MESIBottomCC` 类和 `MESITopCC` 类的方法则定义在 cpp 文件中。**

接下来，我们将逐一描述一致性操作。



### Invalidation

> 代码版本可能存在差异

失效（Invalidation）可以在缓存的任何级别通过调用 `invalidate()` 方法来启动。事实上，连一致性协议也会调用此方法以使子缓存中的块失效。`invalidate()` 方法的语义保证了被失效的块不会在调用它的级别以及所有子级别的缓存中存在。在本节中，我们展示了 `invalidate()` 如何与缓存一致性交互。

`invalidate()` 方法首先使用标签数组的 `lookup()` 方法执行缓存查找（但不更新 LRU 状态）。如果在标签数组中找到了该块，块的地址和索引会被传递给一致性控制器的 `processInv` 方法。请注意，`invalidate()` 同时处理降级（`INVX`）和真正的失效（`INV`）。失效的类型通过 `type` 参数指定。当请求降级时，假定调用 `invalidate()` 的当前级别以及下方的所有级别将持有 M（修改）或 E（排他）状态的块。

在非终端一致性控制器中，`processInv()` 只是调用 `tcc` 的 `processInval()` 方法，然后再调用 `bcc` 中同名的方法。然而，完成周期是 `tcc` 完成广播的周期。这反映了 zSim 做出的一个重要假设：广播在关键路径上，而脏数据的传输和本地状态变化不是。

在 `tcc` 的 `processInval()` 方法中，`sendInvalidates()` 被调用，向在共享者列表中有“1”位的子缓存广播失效请求。详细说明一下：该函数遍历块的共享者列表，对于每个潜在的共享者，递归地调用该缓存对象的 `invalidate()` 方法（回想一下，我们现在处于最初的 `invalidate()` 调用链中）。失效的类型和指示脏写回的布尔标志会被原封不动地传递。zSim 假设所有失效请求会同时发出到所有子缓存。单个失效的完成周期是从子缓存收到的响应周期加上网络延迟。由于所有请求都是并行发送的，最终的完成周期是所有子缓存失效的最大值。在所有子缓存响应后，控制器会根据失效类型更改当前块的目录条目。对于完全失效，目录条目会被清除，因为该块不再存在于缓存中。对于降级，目录条目的独占标志会被清除，但共享者列表的位向量保持不变。

在 `tcc` 的 `processInval()` 方法返回后，`bcc` 的 `processInval()` 方法会被调用以处理本地状态变化。对于完全失效，我们始终将一致性状态设置为 I，并且如果当前状态是 M（修改），则设置写回标志，以向调用者发出脏写回的信号。请注意，由于整个层级结构中最多只有一个缓存持有脏副本，脏写回标志在失效过程中会被设置一次。对于降级，我们仅将当前的 M 或 E 状态（其他状态是非法的）更改为 S，并且如果当前状态是 M，则设置写回标志。失效过程中不会发生实际的写回。缓存对象的 `invalidate()` 方法的调用者应该通过启动 PUTX 事务在父缓存或其他内存对象（如 DRAM、NVM）上处理脏写回。

`lineAddr`：需要失效或降级的缓存行地址。

`lineId`：该缓存行在目录中的条目索引。

`type`：失效类型，可能是 `INV`（真正的失效）或 `INVX`（降级请求）。

`reqWriteback`：指向脏写回标志的指针，指示是否需要执行写回操作。

`cycle`：当前周期，表示请求发出的时刻。

`srcId`：源 ID，通常是请求发起方的 ID。

```c++
uint64_t MESITopCC::sendInvalidates(Address lineAddr, uint32_t lineId, InvType type, bool* reqWriteback, uint64_t cycle, uint32_t srcId) {
    //Send down downgrades/invalidates
    // 这行代码根据 lineId 从目录中获取当前缓存行（lineAddr）的条目，e 表示该条目的引用。
    Entry* e = &array[lineId];

    //Don't propagate downgrades if sharers are not exclusive.
    // 如果请求类型是 INVX（降级请求），并且该缓存行的当前条目（e）不是独占的（e->isExclusive() 为 false）
    // 则不传播降级请求，直接返回当前周期。因为只有在该缓存行是独占的情况下，才能进行降级处理。
    if (type == INVX && !e->isExclusive()) {
        return cycle;
    }
	// 初始化 maxCycle 为当前周期。这是因为我们假设所有的失效请求都是并行发送的，因此需要记录所有子缓存响应的最大周期。
    uint64_t maxCycle = cycle; 
    // 遍历子缓存，发送失效或降级请求：
    if (!e->isEmpty()) { // 如果为空，则跳过处理
        uint32_t numChildren = children.size(); // 获取子缓存数量
        uint32_t sentInvs = 0; // 初始化 sentInvs 计数器，记录实际发送的失效请求数量
        // 遍历每个子缓存 如果该子缓存是共享者（e->sharers[c] 为 true），则创建一个 InvReq 请求，并调用该子缓存的 invalidate() 方法发送失效请求。
        for (uint32_t c = 0; c < numChildren; c++) {
            // e->sharers[c] 用于指示 children[c]（子缓存）是否持有 e 对应的缓存行副本
            if (e->sharers[c]) {
                // 创建一个 InvReq 请求，并调用该子缓存的 invalidate() 方法发送失效请求。
                InvReq req = {lineAddr, type, reqWriteback, cycle, srcId};
                // 每个子缓存的响应周期会加上其网络延迟（childrenRTTs[c]），然后更新 maxCycle 为最大的响应周期。
                uint64_t respCycle = children[c]->invalidate(req);
                respCycle += childrenRTTs[c];
                maxCycle = MAX(respCycle, maxCycle);
                // 如果是 INV 类型的失效请求，则清除共享者标志（e->sharers[c] = false），表示该子缓存不再共享该块。
                if (type == INV) e->sharers[c] = false;
                sentInvs++;
            }
        }
        // 检查发送的失效请求数量（sentInvs）是否等于该块的共享者数量（e->numSharers），这是为了确保所有共享者都被处理。
        assert(sentInvs == e->numSharers);
        // 如果是 INV 类型的失效请求，清空共享者数量（e->numSharers = 0），表示该块已经没有共享者。
        if (type == INV) {
            e->numSharers = 0;
        } else {
            // 如果是 INVX 类型的降级请求：确保该条目是独占的并且只有一个共享者，将独占标志（e->exclusive）设置为 false，表示该缓存不再独占该块
            //TODO: This is kludgy -- once the sharers format is more sophisticated, handle downgrades with a different codepath
            assert(e->exclusive);
            assert(e->numSharers == 1);
            e->exclusive = false;
        }
    }
    // 最后，返回最大响应周期，表示所有失效请求的完成周期。
    return maxCycle;
}
```



### Eviction

当缓存集满时，新的块被加载到缓存中时，会自然触发缓存行的逐出操作。**缓存对象没有外部接口来主动发起逐出操作**。相反，当标签数组的 `preinsert()` 方法返回有效的块编号，表示需要逐出的块时，缓存控制器会调用一致性控制器的 `processEviction()` 方法。一致性控制器的 `processEviction()` 方法依次调用 `tcc` 和 `bcc` 上同名的方法（这只是一个不幸的巧合），并返回 `bcc` 的完成时间作为逐出操作的完成时间。需要注意的是，通过返回 `bcc` 的完成时间，**zSim 假设 `tcc` 的广播和 `bcc` 的写回是串行的，即后者只能在前者返回后才能继续执行。这个设计决策是合理的，因为脏数据写回需要先看到脏块，而这个脏块会通过一个旁路通道从子缓存传递给一致性控制器。**

**`tcc` 的 `processEviction()` 方法**

`processEviction()` 方法本质上包装了 `sendInvalidates()` 方法，后者会通知子缓存进行缓存行的失效操作。失效类型设置为 `INV`，表示块必须完全失效。脏数据写回标志被传递到一致性控制器的 `processEviction()` 的局部变量中，然后再传递到 `bcc` 的 `processEviction()` 方法中以实际执行写回操作。

```c++
uint64_t MESITopCC::processEviction(Address wbLineAddr, uint32_t lineId, bool* reqWriteback, uint64_t cycle, uint32_t srcId) {
    if (nonInclusiveHack) {
        // Don't invalidate anything, just clear our entry
        array[lineId].clear();
        return cycle;
    } else {
        //Send down invalidates
        return sendInvalidates(wbLineAddr, lineId, INV, reqWriteback, cycle, srcId);
    }
}
```

**`bcc` 的 `processEviction()` 方法**

在发送失效请求后，`bcc` 的 `processEviction()` 方法会改变本地状态并执行写回操作。首先，它会检查由 `tcc` 的失效过程设置的脏数据写回标志。如果该标志被设置，意味着某个子缓存在失效地址上有脏块，`bcc` 会首先将本地状态从 `E` 或 `M` 更改为 `M`（其他状态是非法的）。需要注意的是，`E` 状态表示子缓存最初通过 `GETS` 请求获取该缓存行，并在获取过程中从 `E` 状态悄无声息地转换为 `M` 状态。而 `M` 状态则意味着子缓存最初通过 `GETX` 获取该缓存行，在传递过程中将所有持有该块的缓存设置为 `M` 状态。

同样，zSim 假设子缓存会通过旁路通道将脏块传递给当前控制器，而不是通过常规的 `MemReq` 请求。这个假设是合理的，因为逐级写回数据是不必要的，因为这些在最底层脏块拥有者和当前缓存对象之间的写回副本最终会被失效。

```c++
uint64_t MESIBottomCC::processEviction(Address wbLineAddr, uint32_t lineId, bool lowerLevelWriteback, uint64_t cycle, uint32_t srcId) {
    MESIState* state = &array[lineId];
    if (lowerLevelWriteback) {
        // lowerLevelWriteback 是一个布尔值，指示是否需要执行写回操作。
        // 如果为 true，表示该缓存行在逐出之前已经被写回（可能是通过 tcc 发出的失效请求）。
        // 这时，缓存行可能从 E 状态（排他状态）悄然转移到 M 状态（已修改状态），因为在缓存一致性协议中，写回操作需要将数据标记为已修改。
        //If this happens, when tcc issued the invalidations, it got a writeback. This means we have to do a PUTX, i.e. we have to transition to M if we are in E
        assert(*state == M || *state == E); //Must have exclusive permission!
        *state = M; //Silent E->M transition (at eviction); now we'll do a PUTX
    }
    uint64_t respCycle = cycle;
    switch (*state) {
        case I:
            break; //Nothing to do
        // 表示缓存行是共享的或排他的，可能需要将数据写回。
        // 这里生成了一个 PUTS 请求，表示将数据写回到 靠近内存的缓存。PUTS 表示缓存行的数据被“存储”或“保存”到更远的缓存或内存。
        case S:
        case E:
            {
                MemReq req = {wbLineAddr, PUTS, selfId, state, cycle, &ccLock, *state, srcId, 0 /*no flags*/};
				//printf("[71] ID=%d, name=%s\n", getParentId(wbLineAddr), parents[getParentId(wbLineAddr)]->getName());
                respCycle = parents[getParentId(wbLineAddr)]->access(req);
            }
            break;
        case M:
            {
                MemReq req = {wbLineAddr, PUTX, selfId, state, cycle, &ccLock, *state, srcId, 0 /*no flags*/};
				//printf("[78] ID=%d, name=%s\n", getParentId(wbLineAddr), parents[getParentId(wbLineAddr)]->getName());
                respCycle = parents[getParentId(wbLineAddr)]->access(req);
            }
            break;
		// 每种状态下都会创建一个 MemReq 请求，并通过调用 parents[getParentId(wbLineAddr)]->access(req) 
        // 将请求发送到更远的缓存（通常是 靠近内存的缓存，例如 L2、L3 或主存）。
        default: panic("!?");
    }
    // 在逐出操作完成后，代码确保缓存行的最终状态应当是 I（无效）。这是因为缓存行在逐出后不再有效，应该从所有缓存中移除。
    // 目前不清楚是哪里让这个state变成I状态的
    assert_msg(*state == I, "Wrong final state %s on eviction", MESIStateName(*state));
    return respCycle;
}
```

* `tcc` 是多核系统中负责管理 **缓存一致性协议** 的控制器，它位于缓存层次的 **上层**。它负责协调不同缓存层级之间的数据一致性，确保多个 CPU 核心之间访问数据时的一致性。`tcc` 不直接进行数据的写回，但它会管理缓存失效（invalidate）和降级（downgrade）的请求。在一些系统中，`tcc` 可能会向下层的缓存发送写回请求，特别是在多级缓存的情况下，它会通知底层缓存（如 L3 或内存控制器）进行写回。

* `bcc` 负责的是 **缓存的写回操作**，并确保数据最终写回到内存系统。它通常位于缓存层次的 **较低** 位置，接近 **内存**，如 L3 缓存或直接与内存控制器相连的部分。`bcc` 的作用是将来自上层缓存（例如 L1 或 L2）的脏数据写回到上层缓存或内存。

* 一个负责失效广播，另一个负责写回操作

**写回的类型**

写回的类型取决于处理子缓存脏写回后的块状态。如果块的状态是 `E` 或 `S`，表示不需要写回脏数据，一致性控制器会创建一个 `PUTS` 类型的 `MemReq` 请求，并调用父缓存的 `access()` 方法同步处理写回操作。另一方面，如果块的状态是 `M`，则会创建一个 `PUTX` 类型的 `MemReq` 请求，并将其传递给父缓存的 `access()` 方法。`I` 状态的块将被忽略，因为它们既没有共享者，也不需要任何形式的写回。

在所有情况下，父缓存的 `access()` 方法的完成周期会作为逐出操作的完成周期返回给调用者。**正如前面章节所讨论的，当父缓存处理该请求时，当前块的状态将被设置为 `I`，表示该块不再被当前层级以下的任何缓存所缓存。**

**设计决策**

一个设计决策是，当块是干净的（没有脏数据时），是否应该向父缓存发送 `PUTS` 请求。一般来说，发送干净的写回有助于父缓存管理其共享者列表，主动移除共享者并使共享者列表更加准确。虽然不准确的共享者列表不会影响正确性，但会导致不必要的额外一致性消息被发送到那些并不实际持有该块的缓存。

**zSim 将 `PUTS` 请求的创建和处理解耦。`PUTS` 请求总是在可能的情况下发送，但父缓存可以选择忽略它们。由于 zSim 不模拟网络利用率，并假设所有失效请求是并行发送的，因此不提前清理共享者列表不会影响仿真结果（尽管如此，zSim 仍然会在干净写回时清理共享者列表）。**



### GETS/GETX Access

> 这一部分还没太明白，先放着

我们将 `access()` 方法分为两个部分进行讨论。在本节中，我们将介绍如何处理 `GETS` 和 `GETX` 请求。在下一节中，我们将介绍 `PUTS` 和 `PUTX` 请求的处理方式。

缓存对象的 `access()` 方法首先会在标签数组中执行查找。如果地址没有命中缓存，并且请求是 `GETS` 或 `GETX`，那么我们首先需要逐出一个现有的缓存块（通过 `preinsert()` 和 `processEviction`）

```c++
if (lineId == -1 && cc->shouldAllocate(req)) {
            //Make space for new line
            Address wbLineAddr;
            lineId = array->preinsert(req.lineAddr, &req, &wbLineAddr); //find the lineId to replace
            trace(Cache, "[%s] Evicting 0x%lx", name.c_str(), wbLineAddr);
            cc->processEviction(req, wbLineAddr, lineId, respCycle); 
            array->postinsert(req.lineAddr, &req, lineId); 
        }
```

然后通过调用一致性控制器的 `processAccess()` 从父级缓存中加载目标块。

```c++
respCycle = cc->processAccess(req, lineId, respCycle);
```

如果父级缓存中没有该块，这个过程可能会递归进行，直到找到一个拥有足够权限的父级缓存，或者最终访问到 DRAM（或其他类型的主内存）。如果地址已命中缓存，尽管缓存命中，我们仍然需要调用 `processAccess()` 来更新缓存块的一致性状态，因为缓存命中可能也会改变块的状态（例如，如果 `GETX` 请求命中一个 `E` 状态的块，该状态会静默地转为 `M`）。保持不变的原则是：无论是逐出还是命中块，`processAccess()` 方法总是能看到一个有效的缓存行号，这个行号是用来加载新块或者改变现有一致性状态的插槽（请记住，逐出后，缓存行的状态会变成 `I`，即无效）。

```c++
		case GETS:
            if (*state == I) {
                uint32_t parentId = getParentId(lineAddr);
                MemReq req = {lineAddr, GETS, selfId, state, cycle, &ccLock, *state, srcId, flags};
                uint32_t nextLevelLat = parents[parentId]->access(req) - cycle;
                uint32_t netLat = parentRTTs[parentId];
                profGETNextLevelLat.inc(nextLevelLat);
                profGETNetLat.inc(netLat);
                respCycle += nextLevelLat + netLat;
                profGETSMiss.inc();
                assert(*state == S || *state == E);
            } else {
                profGETSHit.inc();
            }
            break;
        case GETX:
            if (*state == I || *state == S) {
                //Profile before access, state changes
                if (*state == I) profGETXMissIM.inc();
                else profGETXMissSM.inc();
                uint32_t parentId = getParentId(lineAddr);
                MemReq req = {lineAddr, GETX, selfId, state, cycle, &ccLock, *state, srcId, flags};
				//printf("[130] ID=%d, name=%s\n", parentId, parents[parentId]->getName());
                uint32_t nextLevelLat = parents[parentId]->access(req) - cycle;
                uint32_t netLat = parentRTTs[parentId];
                profGETNextLevelLat.inc(nextLevelLat);
                profGETNetLat.inc(netLat);
                respCycle += nextLevelLat + netLat;
            }
```

在终端级一致性控制器中，`processAccess()` 只会调用 `bcc` 的同名方法。对于 `GETS` 请求，我们首先检查当前的缓存一致性状态。如果状态是 `E`、`S` 或 `M`，则控制器已经拥有足够的权限访问该缓存块，此时不会进行一致性操作。如果缓存块处于 `I` 状态，则需要从父级缓存中将该块带入当前缓存。为此，控制器会创建一个 `GETS` 类型的 `MemReq` 对象，并递归调用父级缓存的 `access()` 方法。当父级缓存返回后，当前块的一致性状态会被父级缓存的 `access()` 方法设置，状态应该是 `S`（即当前缓存和其他缓存持有该块）或者 `E`（当父级缓存是该块唯一的持有者，并且父级本身也拥有 `E` 或 `M` 权限时）。

对于 `GETX` 请求，如果当前块的状态是 `E`，则该块会静默地转为 `M` 状态，而不会通知父级缓存。当前缓存持有脏数据块的事实，只有当无效化操作迫使 `M` 状态的块被写回时，父级缓存才能得知。如果当前块的状态是 `I` 或 `S`，则与 `GETS` 请求类似，控制器会创建一个 `GETX` 类型的 `MemReq` 对象，并将其递交给父级缓存的 `access()` 方法，以使其无效化所有共享副本（包括其父级缓存的副本等）。父级缓存的 `access()` 方法将会设置该块的最终状态，应该是 `M`。

在非终端级缓存的一致性控制器中，`GETS` 和 `GETX` 请求的处理要更加复杂。非终端一致性控制器中有两个不变的原则。第一个原则是，控制器只有在持有相同或更高权限的情况下，才能授予子缓存相应的权限。例如，持有 `S` 状态行的控制器，在没有先从父级获取 `M` 权限的情况下，不能将 `M` 权限授予子缓存。第二个原则是，非终端缓存控制器总是将其获取的数据发送给子缓存（预取操作除外，这部分我们不做讨论）。

当接收到来自子缓存的请求时，非终端一致性控制器首先会尝试获取子缓存请求所需的等价或更高权限，如果当前控制器不持有该块的相应权限。这相当于调用 `bcc` 的 `processAccess()`，其效果与终端控制器相同。`processAccess()` 返回后，当前缓存应该拥有足够的权限来授予子缓存的请求，此时通过调用 `tcc` 的 `processAccess()` 来执行该操作。该函数的一个参数是布尔标志，指示当前缓存块的状态是否为独占状态（即 `M` 或 `E`）（请记住，`tcc` 无法访问当前块的状态，只能访问子块的状态）。该函数还需要一个参数，指示是否由于子缓存的权限降级而导致脏写回。

在高层次上，`processAccess()` 方法会根据请求类型和当前缓存中块的状态，设置子缓存块的状态以及自身目录的状态。我们将逐个具体讨论处理过程。如果请求是 `GETX`，我们会检查共享者列表，看看该块是否被多个子缓存共享。如果是，则调用 `sendInvalidates()` 来撤销所有子缓存中的共享缓存行。请注意，当 `tcc` 开始处理请求时，当前缓存块的状态必须已经是独占状态。这并不与以下事实相矛盾：它的一个或多个子缓存可能仍然持有该块的共享或独占副本。如果无效化操作导致脏写回，则会设置标志，并由一致性控制器处理写回。无效化之后，我们将通过清除共享者列表中的所有位，除了请求者的位，来将请求者标记为该缓存行的独占所有者。

如果请求是 `GETS`，在 `bcc` 的 `processAccess()` 之后，当前块的状态可以是有效状态中的任何一个。在 MESI 协议中，如果当前缓存持有该块并处于独占状态，并且该块没有其他共享者，则 `tcc` 可以将 `E` 权限授予请求者，因为我们可以确定当前缓存持有该行的全局唯一副本，并且可以授予其子缓存写权限。另一方面，如果当前状态是独占状态，但另一个子缓存独占持有该块，那么就需要进行无效化操作，使用 `INVX` 将当前所有者的状态降级为共享状态（`S`），然后才可以将 `S` 权限授予请求者。如果当前状态是共享状态，意味着该块不是由当前缓存独占所有，而是被其他缓存共享，那么请求者将直接获得 `S` 状态，而不需要进行无效化操作。在这三种情况下，请求者都会被标记为共享者。

如果由于 `GETS` 或 `GETX` 的降级或完全无效化导致脏写回，则会将脏数据写回传递给一致性控制器，并在 `processWritebackOnAccess()` 中处理。回顾一下，zSim 假设脏块通过旁路通道传输，这个通道不在无效化操作的关键路径上，这不会增加操作的延迟，只是简单地将当前块的状态从 `M` 或 `E` 更改为 `M`（其他状态是非法的）。



### PUTS/PUTX Access

`PUTS` 和 `PUTX` 专门用于写回操作，且只能在层级中的非终端级处理。这两种请求首先由 `bcc` 处理，然后由 `tcc` 处理。`bcc` 会忽略 `PUTS` 请求，因为这些是干净数据，不会改变块的状态。对于 `PUTX` 请求，块的状态会从 `M` 或 `E` 转变为 `M`（其他状态是非法的）。另一方面，`tcc` 不会忽略 `PUTS`，而是会清除共享者列表中子缓存的位。

如果请求对象中没有设置 `PUTX_KEEPEXCL` 标志，`PUTX` 的处理方式与 `PUTS` 完全相同（该标志要求脏数据被写回，但保持子块处于 `E` 状态）。在这两种情况下，子缓存的状态会被设置为 `I`，表示该块已经被写回，且不再被子级缓存所持有。



### Beyond Last Level Cache

当一个 `GETX`/`GETS` 请求到达最后一级缓存（LLC），但仍然找不到缓存块，或者当 LLC 驱逐一个脏块时，请求会去哪里？在 zSim 中，所有内存对象都是 `MemObject` 基类的实例，包括缓存和**主存**。在初始化过程中，LLC 会通过将其父级列表指向主内存对象来与主内存连接，**主存对象也具有优雅的 `access()` 接口**（注意，**主存对象没有 `invalidate()` 方法**，因为这个方法是添加在 `BaseCache` 类中的）。因此，超出 LLC 的 `MemReq` 请求会被发送到主存对象，然后像缓存一样进行模拟，可能会有显著不同的时序。



[参考] Ziqi Wang : [Understanding Cache System Simulation in zSim](https://wangziqi2013.github.io/article/2019/12/25/understand-zsim-cc-sim.html)