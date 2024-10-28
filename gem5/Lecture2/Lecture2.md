# Lecture 2

## 内存缓冲区

以DRAM为例

DRAM缓冲区是用于提高内存访问效率的重要组件。缓冲区是一个临时存储区域，用于存放数据和请求，以便在数据处理时减小延迟。DRAM控制器中的缓冲区通常用于存储待处理的读写请求。

### 相关概念

* **写缓冲区**: 存储待写入DRAM的数据。当写请求到达时，数据首先写入缓冲区，待缓冲区达到一定条件后再写入内存。这有助于提高写入效率，特别是在高写入负载的场景中。

* **读缓冲区**: 存储从DRAM读取的数据。当数据请求到达时，首先检查缓冲区以查看是否有待处理的数据，从而减少直接从内存读取的延迟。

* **缓冲区的结构**
  * 缓冲区通常由一组寄存器和存储单元组成，允许快速读写操作。硬件上，这些寄存器可能与DRAM存储单元相连，通过数据总线传输信息。
  * 写缓冲区和读缓冲区通常是分开的，以减少写入和读取之间的冲突。
* **控制器接口**
  * DRAM控制器负责管理缓冲区与内存之间的交互。控制器监控缓冲区的状态（如满或空），并根据调度策略决定何时将数据从缓冲区写入内存或从内存读取数据到缓冲区。
* **存取时间**:
  - 不同类型的缓冲区具有不同的存取时间，通常写缓冲区的访问时间会低于直接访问DRAM的时间。硬件设计需要确保缓冲区在高负载条件下仍能快速响应。



### gem5 MemCtrl Parameters

```python
 write_high_thresh_perc = Param.Percent(85, "Threshold to force writes")
```

**Write High Threshold Percentage** (`write_high_thresh_perc`): 该参数设定了写缓冲区的填充阈值。当填充度达到这个百分比时，控制器会**强制开始写**操作，以**避免缓冲区溢出和潜在的性能瓶颈**。这个策略帮助管理数据流动，**确保写入请求得到及时处理，防止数据丢失或延迟**。



```python
write_low_thresh_perc = Param.Percent(50, "Threshold to start writes")
```

**Write Low Threshold Percentage** (`write_low_thresh_perc`): 当**读取队列为空**且**写缓冲区低于此阈值**时，控制器会开始执行写操作。此设置确保**即使在没有读取请求的情况下，写入请求也能够被及时调度**。这对维持写入操作的流畅性和内存利用率至关重要。



```python
min_writes_per_switch = Param.Unsigned(16, "Minimum write bursts before switching to reads")
```

**Minimum Writes Per Switch** (`min_writes_per_switch`): 此参数设定了在控制器切换到读取操作之前，必须完成的最小写突发数量。这样的设计能够避免过于频繁地在读写操作之间切换，从而减少切换开销，提高整体性能。



```python
min_reads_per_switch = Param.Unsigned(16, "Minimum read bursts before switching to writes"    )
```

**Minimum Reads Per Switch** (`min_reads_per_switch`): 与最小写突发类似，此参数规定了在切换到写操作之前必须完成的最小读突发数量。此设计确保读取请求得到合理的服务，从而提高内存访问的效率。



```python
mem_sched_policy = Param.MemSched("frfcfs", "Memory scheduling policy")
```

```python
class MemSched(Enum):
    vals = ["fcfs", "frfcfs"]
```

**Memory Scheduling Policy** (`mem_sched_policy`): 内存调度策略决定了控制器如何处理和调度内存请求。常见的策略包括FCFS（先到先服务）、FRFCFS（优先就绪、先服务）等。这些策略影响内存带宽的使用效率，优化系统的整体性能。



```python
static_frontend_latency = Param.Latency("10ns", "Static frontend latency")
static_backend_latency = Param.Latency("10ns", "Static backend latency")
```

**Static Frontend Latency** (`static_frontend_latency`): 前端延迟指的是控制器接收请求后到处理请求之间的时间延迟。前端延迟通常与控制器的设计和工作方式有关，影响请求的调度和响应速度。

**Static Backend Latency** (`static_backend_latency`): 后端延迟是指控制器在处理请求后，实际访问内存所需的时间。这包括从控制器发送命令到内存响应之间的延迟。后端延迟直接影响实际的数据传输速度，是系统性能的关键因素。



```python
command_window = Param.Latency("10ns", "Static backend latency")
```

命令窗口是这个延迟与控制器在处理请求时的效率和性能密切相关，如果命令窗口的延迟很大，控制器需要更长时间来处理每个命令，因此在给定的时间内，它能够处理的请求数量就会减少。



```python
disable_sanity_check = Param.Bool(False, "Disable port resp Q size check")
```

**Disable Sanity Check** (`disable_sanity_check`): 该参数控制是否禁用对端口响应队列大小的检查。启用此检查可以防止队列溢出导致的错误，但在某些高性能计算场景中，禁用此检查可以提供更大的灵活性和性能。选择是否启用此检查取决于系统的具体需求和性能目标。



## 内存突发传输

在计算机系统中，内存访问通常是以“突发”（burst）的方式进行的。突发传输是一种数据传输方式，允许在单个内存访问中传输多个字节（或数据块）。这种方式能够提高内存带宽和效率。然而，当要传输的数据包大于单个突发大小时，就需要将其拆分成多个小的数据包进行传输。

内存突发大小（Burst Size）是指在一次内存访问中，可以连续读取或写入的字节数。突发大小通常与突发长度（Burst Length）相关。

具体来说：
$$
BurstSize=BurstLength \times DataWidth
$$
以`DDR5_4400_4x8`为例 (`/src/mem/DRAMInterface.py`)

```python
class DDR5_4400_4x8(DRAMInterface):
    device_size = "512MiB"
    device_bus_width = 8
    burst_length = 16
    device_rowbuffer_size = "256B"
    devices_per_rank = 4
    ranks_per_channel = 1
    bank_groups_per_rank = 8
    banks_per_rank = 32
    write_buffer_size = 64
    read_buffer_size = 64
```

单个`Device` 位宽8，一个通道Channel位宽32
$$
TotalBurstSize=BurstLength \times DeviceBusWidth \times DevicePerRank
=16 \times 8 \times 4 = 512bits = 64Bytes
$$
要传输的数据包大于单个突发大小时，就需要将其拆分成多个小的数据包进行传输，gem5提供了一种`BurstHelper`的思路和实现.

```C++
class BurstHelper
{
  public:
    const unsigned int burstCount;
    unsigned int burstsServiced;
    BurstHelper(unsigned int _burstCount)
        : burstCount(_burstCount), burstsServiced(0)
    { }
};
```

这个`BurstHelper`类的主要作用是管理和组织一个大于内存突发大小（`burst size`）的数据包

* `burstCount`:
  - 这是一个常量，表示处理该数据包所需的突发数量。它是在类构造时通过参数`_burstCount`初始化的

* `burstsServiced`:
  - 这是一个可变的计数器，记录到目前为止已经处理（serviced）的突发数量。初始值为0，每当一个突发被处理时，这个值会增加
* `BurstHelper(unsigned int _burstCount)`:
  - 这是构造函数，用于初始化`burstCount`和`burstsServiced`。`burstsServiced`会被初始化为0，表示在构造时还没有任何突发被处理

这个`BurstHelper`的功能主要是以下两个部分：

* **管理大数据包**: 当一个数据包的大小大于内存突发大小时，`BurstHelper`可以帮助管理这个数据包的多个部分。它跟踪需要处理多少个突发以及已经处理了多少个
* **状态跟踪**: 通过`burstsServiced`，系统可以轻松地知道当前处理的进度，从而知道何时整个数据包的传输完成。



## 内存控制器实例解析

### Step1

依然是定义一个内存控制器对应的Python类，具体的参数意义已经在内存缓存区下有过介绍，这里不再赘述。除了那几个参数之外，还定义了`port`和`dram`，用于响应的端口和相应的内存介质（就是传入内存介质参数的入口）。

```python
from m5.citations import add_citation
from m5.objects.QoSMemCtrl import *
from m5.params import *
from m5.proxy import *

class MemSched(Enum):
    vals = ["fcfs", "frfcfs"]

class MemCtrl(QoSMemCtrl):
    type = "MemCtrl"
    cxx_header = "mem/mem_ctrl.hh"
    cxx_class = "gem5::memory::MemCtrl"
    
    port = ResponsePort("This port responds to memory requests")
    dram = Param.MemInterface(
        "Memory interface, can be a DRAMor an NVM interface "
    )
    write_high_thresh_perc = Param.Percent(85, "Threshold to force writes")
    write_low_thresh_perc = Param.Percent(50, "Threshold to start writes")
    min_writes_per_switch = Param.Unsigned(
        16, "Minimum write bursts before switching to reads"
    )
    min_reads_per_switch = Param.Unsigned(
        16, "Minimum read bursts before switching to writes"
    )
    mem_sched_policy = Param.MemSched("frfcfs", "Memory scheduling policy")
    static_frontend_latency = Param.Latency("10ns", "Static frontend latency")
    static_backend_latency = Param.Latency("10ns", "Static backend latency")

    command_window = Param.Latency("10ns", "Static backend latency")
    disable_sanity_check = Param.Bool(False, "Disable port resp Q size check")
```



### Step2

现在就要编写相应的头文件(`.hh`文件)。

回想一下上一个Lecture关于创建一个简单的Memory Object部分。我们定义了一个变量`blockedPacket`用于暂存还未处理（等待处理）的Packet。这样的行为本质上就是缓冲。而`blockedPacket`变量显然只能缓冲一个Packet，一旦已经buffer了一个，其它的（对应端口的发送数据包）请求将会被阻塞。这在计算机系统中，显然已经是一件无法接受的事情。

很自然的想法就是不止buffer一个，而是能够buffer很多。一种简单且实用的数据结构就是队列。我们可以用一个队列buffer所有待处理的请求。但我们一定还有更好的做法。回想在本节最开始的部分，内存缓冲区的读缓冲区和写缓冲区是区分的，自然而然的，内存控制器也应该最好是区分读写缓冲队列。

```c++
    std::vector<MemPacketQueue> readQueue;
    std::vector<MemPacketQueue> writeQueue;
```

于是，在gem5的`mem_ctrl.hh`文件中就定义了这样两个读写队列。

当我们有了这样两个队列的设想之后，许多相关的问题就随之出现：

* 如何把请求添加到对应的队列？
* 队列是否需要一定的重排序以让更需要被快速处理的请求尽早处理？
* 队列满了怎么办？
* 怎样选择下一个处理的请求？
* ......

所以问题一下就复杂了起来，如果没有深厚的内存理论功底，编写一个”看上去“正确的内存控制器就已经是一件不太容易的事情。好在前人已经做了足够的工作和相应的完善，现阶段，我们只需要试图正确理解一个内存控制器干了什么，就已经是一件不错的事情了。



首先，回想一下上一节提到的Memory Object之间的交互方式，请求以Packet为载体，通过port进行交互。这件事情在内存控制器上会发生什么？内存控制器已经是Memory Object交互的最终层级（SE模式，没有`disk`）了，它直接管理了内存。就像公交车已经开到了终点站，你需要下车自己找到回家的路。内存有自己的层次结构，比如:`rank` 、`bank` 、`row` 等等。请求的目标也需要在对应的层次结构中逐级找到。这也涉及到了内存交叉编址（内存交织）【本节暂时不讨论这个问题】。

因此，一个Packet（回想一下Packet携带了什么？）已经不足以满足内存访问，（我们也还需要这个packet能干更多的事情）。一个新的类诞生了：`MemPacket`

```c++
class MemPacket
{
  public:
    // 请求到达控制器的时间
    const Tick entryTime;
    // 请求离开（准备离开）的时间
    Tick readyTime;
    // 来源于外部(上层)的Packet
    const PacketPtr pkt;
    // 与请求关联的id
    const RequestorID _requestorId;
    const bool read;
    // 是不是DRAM,也有可能是NVM
    const bool dram;
    // 伪通道序？
    const uint8_t pseudoChannel;
    const uint8_t rank;
    const uint8_t bank;
    const uint32_t row;
    // 假设有两个Rank 每个Rank8个Bank 那么bankId=0 意味着是第0个rank的第0个bank
    // bankId=8 意味着是第1个rank的第0个bank
    const uint16_t bankId;
    // Packet的起始地址， 这个地址不一定与突发传输边界对齐。具体见下注：
    Addr addr;
    // 数据包大小（字节为单位），小于等于突发传输大小
    unsigned int size;
    // 上面已经有过描述，如果这不是一个split packet，将会被置为NULL
    BurstHelper* burstHelper;
    // QoS 值，这在后续Lecture会具体描述，这里只需要理解为这是某种程度上的优先级
    uint8_t _qosValue;
    // 设置QoS
    inline void qosValue(const uint8_t qv) { _qosValue = qv; }
    // 获取QoS
    inline uint8_t qosValue() const { return _qosValue; }
    // 获取Packet RequestorID
    inline RequestorID requestorId() const { return _requestorId; }
    // 获取Packet大小
    inline unsigned int getSize() const { return size; }
    // 获取Packet地址
    inline Addr getAddr() const { return addr; }
    inline bool isRead() const { return read; }
    inline bool isWrite() const { return !read; }
    inline bool isDram() const { return dram; }

    MemPacket(PacketPtr _pkt, bool is_read, bool is_dram, uint8_t _channel,
               uint8_t _rank, uint8_t _bank, uint32_t _row, uint16_t bank_id,
               Addr _addr, unsigned int _size)
        : entryTime(curTick()), readyTime(curTick()), pkt(_pkt),
          _requestorId(pkt->requestorId()),
          read(is_read), dram(is_dram), pseudoChannel(_channel), rank(_rank),
          bank(_bank), row(_row), bankId(bank_id), addr(_addr), size(_size),
          burstHelper(NULL), _qosValue(_pkt->qosValue())
    { }

};
```

* **数据包的起始地址的非突发传输边界对齐**

  * 理想情况下，内存访问的地址应对齐到这些边界。但是，有时为了灵活性，尤其是在处理复杂的内存访问模式时，地址可能是未对齐的。**保持未对齐的地址可以让系统在检查传入的读请求时，能够准确地与写队列中的数据包进行匹配**。这样可以提高内存控制器在处理内存请求时的灵活性和效率。

  * 假设有以下示例

    - **突发大小**: 16字节
    - **写请求**: 从地址 `0x1005` 开始，大小为20字节
    - **读请求**: 从地址 `0x1000` 开始，大小为16字节
    - **写请求**:
      - 起始地址：`0x1005`
      - 结束地址：`0x1005 + 20 - 1 = 0x1018`
      - 这意味着写请求覆盖的地址范围是 `0x1005` 到 `0x1018`。
    - **读请求**:
      - 起始地址：`0x1000`
      - 结束地址：`0x1000 + 16 - 1 = 0x100F`
      - 这意味着读请求覆盖的地址范围是 `0x1000` 到 `0x100F`。
    - **重叠区域** ：我们可以看出，这两个请求有重叠：
      - 写请求写入的地址 `0x1005` 到 `0x100F` 会影响读请求。
      - 具体来说，写请求在 `0x1005` 到 `0x100F` 的地址会覆盖读请求所需的部分数据。
    - **当内存控制器接收到读请求时，它需要判断是否有写请求影响到它**：
      - **检查写队列**: 控制器查看写队列中是否有尚未完成的写请求，发现了从 `0x1005` 开始的写请求。
      - **计算覆盖**: 控制器知道读请求期望从 `0x1000` 读取数据，但 `0x1005` 到 `0x100F` 的地址已经被写请求修改。因此，它必须从写队列中提取新数据。

    ### **处理逻辑**

    1. **读取新数据**: 在读取数据时，控制器会优先检查写请求的影响。
    2. **整合数据**: 控制器会将读请求与写请求结合：
       - 从 `0x1000` 到 `0x1004` 的数据可以直接从内存中读取，因为这部分没有被写请求覆盖。
       - 从 `0x1005` 到 `0x100F` 的数据将从写队列中获取，因为这些数据已经被新的写入操作所改变。
    3. **返回结果**: 控制器将结合这两部分数据，确保返回给请求方的是最新且准确的数据。

* 为什么从写队列中读取数据呢？

  * 首先这只是一个举例，假设了读在写之后（至少逻辑上是之后）。
  * 不从写队列读取的话，有可能读到旧数据，从而出现数据一致性的问题
  * 这样的设计可以减少潜在的数据冲突和错误，从而提高整体系统的效率



有了`MemPacket`，我们还需要一个地方存储这些`MemPacket`。

```c++
typedef std::deque<MemPacket*> MemPacketQueue;
```

* `std::deque<MemPacket*>`: 这是 C++ 标准库中定义的双端队列（deque），其中每个元素都是指向 `MemPacket` 类型的指针。
  * **双端队列（deque）** 是一种允许在两端高效插入和删除元素的数据结构：
    * 可以从头部和尾部进行插入和删除操作
    * 具有动态大小，可以根据需要自动调整其容量
    * 支持随机访问，意味着可以通过索引直接访问其中的元素

* `MemPacketQueue` 被用于管理内存数据包，依据其 QoS 优先级将数据包存储在多个 deque 结构中
  * **优先级管理**: 内存控制器可以根据 QoS 值将数据包放入不同的 deque 中，从而确保高优先级的数据包能够被优先处理
  * **灵活性**: 使用 deque 允许在任意一端进行操作，使得控制器能够根据实时需求动态调整数据包的处理顺序

可能你会好奇为什么上面说的是**不同的 deque**，因为可以定义多个优先级队列。



接下来，就可以正式引入内存控制器的相关文件了

```c++
class MemCtrl : public qos::MemCtrl
{
  protected:

    class MemoryPort : public QueuedResponsePort
    {
		......
            
      public:
        
		......

      protected:

       ......

    };

  	......
        
    struct CtrlStats : public statistics::Group
    {
        ......
    };

    ......
        

  public:

 	 ......
         
  protected:

     ......
};
```

由于代码里有一点点小多（但其实完全不多），这里就分开来写了。代买的整体框架如上所示。



### MemCtrl

**Class [ MemCtrl::MemoryPort ]**

```c++
RespPacketQueue queue;
MemCtrl& ctrl;
```

定义一个响应Packet队列；以及内存控制器。

**`public`**

```c++
MemoryPort(const std::string& name, MemCtrl& _ctrl);
void disableSanityCheck();
```

构造函数和完整性检查函数

**`protected`**

```c++
		Tick recvAtomic(PacketPtr pkt) override;
        Tick recvAtomicBackdoor(
                PacketPtr pkt, MemBackdoorPtr &backdoor) override;

        void recvFunctional(PacketPtr pkt) override;
        void recvMemBackdoorReq(const MemBackdoorReq &req,
                MemBackdoorPtr &backdoor) override;

        bool recvTimingReq(PacketPtr) override;
        AddrRangeList getAddrRanges() const override;
```

没有太多好解释的，因为之前的代码中出现过大量类似的函数了。但是新增了一些`xxxBackDoor()`的函数。拿什么是`backDoor`呢？顾名思义就是走后门，函数允许直接访问内存，通常用于调试或性能优化，而不经过常规的内存控制路径。这种方法可能会绕过一些正常的检查和调度，允许更快速的访问。点到为止，不再过多赘述。

**Class [ MemCtrl ]**

```c++
	// 接收来自外部请求的端口，如果要有一个多端口的控制器，需要在多端口前连接crossbar
    MemoryPort port;
	// 是不是TimingMode （有可能是AtmoicMode）
    bool isTimingMode;
	// 是否需要读写重试
    bool retryRdReq;
    bool retryWrReq;
	/**
	 * 在 gem5 中，事件是模拟时间的核心机制，用于调度和处理异步操作。
	 * 下面的函数顾名思义 处理下一个请求事件，处理响应事件
	 */
    virtual void processNextReqEvent(MemInterface* mem_intr,
                          MemPacketQueue& resp_queue,
                          EventFunctionWrapper& resp_event,
                          EventFunctionWrapper& next_req_event,
                          bool& retry_wr_req);
    EventFunctionWrapper nextReqEvent;

    virtual void processRespondEvent(MemInterface* mem_intr,
                        MemPacketQueue& queue,
                        EventFunctionWrapper& resp_event,
                        bool& retry_rd_req);
    EventFunctionWrapper respondEvent;
	// 检查队列是否满了
    bool readQueueFull(unsigned int pkt_count) const;
    bool writeQueueFull(unsigned int pkt_count) const;
    bool addToReadQueue(PacketPtr pkt, unsigned int pkt_count,
                        MemInterface* mem_intr);

    void addToWriteQueue(PacketPtr pkt, unsigned int pkt_count,
                         MemInterface* mem_intr);
   
    virtual Tick doBurstAccess(MemPacket* mem_pkt, MemInterface* mem_intr);

   
    virtual void accessAndRespond(PacketPtr pkt, Tick static_latency,
                                                MemInterface* mem_intr);

    virtual bool packetReady(MemPacket* pkt, MemInterface* mem_intr);

  
    virtual Tick minReadToWriteDataGap();

    virtual Tick minWriteToReadDataGap();

    virtual MemPacketQueue::iterator chooseNext(MemPacketQueue& queue,
        Tick extra_col_delay, MemInterface* mem_intr);

  
    virtual std::pair<MemPacketQueue::iterator, Tick>
    chooseNextFRFCFS(MemPacketQueue& queue, Tick extra_col_delay,
                    MemInterface* mem_intr);

    Tick getBurstWindow(Tick cmd_tick);

    void printQs() const;

    virtual Addr burstAlign(Addr addr, MemInterface* mem_intr) const;

    virtual bool pktSizeCheck(MemPacket* mem_pkt,
                              MemInterface* mem_intr) const;

    std::vector<MemPacketQueue> readQueue;
    std::vector<MemPacketQueue> writeQueue;

    std::unordered_set<Addr> isInWriteQueue;

    std::deque<MemPacket*> respQueue;

    std::unordered_multiset<Tick> burstTicks;

    MemInterface* dram;

    virtual AddrRangeList getAddrRanges();
    uint32_t readBufferSize;
    uint32_t writeBufferSize;
    uint32_t writeHighThreshold;
    uint32_t writeLowThreshold;
    const uint32_t minWritesPerSwitch;
    const uint32_t minReadsPerSwitch;

    enums::MemSched memSchedPolicy;

    const Tick frontendLatency;

    const Tick backendLatency;

    const Tick commandWindow;

    Tick nextBurstAt;

    Tick prevArrival;

    Tick nextReqTime;
```

