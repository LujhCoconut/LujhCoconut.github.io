# Lecture1

## 内存系统编程模型概述

gem5中各级Memory Objects通过ports互联。Ports为Memory Objects提供了接口。

### Ports

主要包含三类：

* Timing
  * 最重要的一类：唯一能够产生正确模拟结果的类；其它两类只用在特定的场合。
* Atomic
  * 用于加速模拟和实现模拟的warm up。这个模式假设内存系统不会产生事件；它认为所有内存请求以单个long callchain（调用链）执行。
* Functional
  * 更合适的叫法为Debugging Mode，在SE模式下较为常用。其能够从Host导入二进制可执行文件（或脚本）到`process.cmd`，以使得模拟系统可以访问。



### Packets

Ports之间的通信传输以Packet为媒介，又由于Memory Objects通过Ports互联，因此也可以理解为Memory Objects以Packet进行交互。

* Packet由`MemReq`构成，即内存请求对象。`MemReq`持有指示请求者、请求地址、请求类型的原始请求信息。

* Packet也包含`MemCmd`，指示当前Packet的命令。这个命令在Packet的生命周期中可以变化。当命令满足（执行结束）时，Request会转向Response。常见的命令包括：

  * `ReadReq` (read request)

  * `ReadResp` (read response)

  * `WriteReq` (write request)

  * `WriteResp` (write response)

  * `WritebackDirty ，WritebackClean` （writeback requests）

* Packet也保留了请求的数据，或者数据的指针
* 尽管Packet最初用于传统cache用于追踪一致性的单元，但在gem5中，即使与一致性无关的Memory Objects（例如：DRAM控制器，CPU模型）以全部使用packet通信。



### Ports Interface

早期版本的gem5的对于port的分类是主从(master-slave)两种。但是因为众所周知的原因，在现在的版本里面已经以`memSidePort(s)`以及`cpuSidePort(s)`代替。

> 注：`cpuSidePort(s)`以及`memSidePort(s)`最原始也是`ResponsePort`以及`RequestPort`

gem5里的Memory Object都至少需要有其中一种类型。

* `master`通常是发送请求（接收响应）`send requests (and receive response)`
* `slave`通常是接受请求   (发送响应)   `receive requests (and send responses)`

![](.\p1.png)

上面就是一个简单的主从Memory Object之间的请求响应流程。如果自己实现一个Memory Object，就需要自己实现:`sendTimingReq`,`RecvTimingReq`,`sendTimingResp`,`recvTimingResp`，以及何时触发这些操作的一系列逻辑。

所有的`port interface`都需要一个`PacketPtr`做参数。`RecvTimingReq`和`recvTimingResp`这类请求会返回一个`bool`类型的值。

![](.\p2.png)



不管是主还是从，都有可能处于`busy`的状态。例如，`slave`如果`busy`，那么`recvTimingReq`就会向`master`返回`false`。`master`在`sendTimingReq`之后，接收到`false`，就会一直等直到`recvReqRetry`执行。`recvReqRetry`被调用才会重新调用`sendTimingRetry`。

`Master busy`也是类似的。  



## Pybind & Declare the SimObject

> **Pybind**
>
> Pybind是一个用于将C++代码绑定到Python的开源库。它允许开发者通过简单的方式创建Python模块，将现有的C++代码暴露给Python解释器，使得这些C++代码可以像Python代码一样被调用和使用



### Step 1

`Memory Object`类的编写第一步通常是定义一个`Python类`。

例如

```python
from m5.params import *
from m5.SimObject import SimObject


class SimpleMemobj(SimObject):
    type = "SimpleMemobj"
    cxx_header = "learning_gem5/part2/simple_memobj.hh"
    cxx_class = "gem5::SimpleMemobj"

    inst_port = ResponsePort("CPU side port, receives requests")
    data_port = ResponsePort("CPU side port, receives requests")
    mem_side = RequestPort("Memory side port, sends requests")
```

> 老版本gem5中的定义无需`cxx_class`，且对应的`.cc / .hh`文件无需嵌入gem5命名空间



### Step 2

编写对应`Memory Object`的头文件

下面是简单的`Memory Object`实现，没有任何`cache`行为，单纯传递请求和响应。

* 定义两种类型的`Port`，

```c++
#ifndef __LEARNING_GEM5_PART2_SIMPLE_MEMOBJ_HH__
#define __LEARNING_GEM5_PART2_SIMPLE_MEMOBJ_HH__

#include "mem/port.hh"
#include "params/SimpleMemobj.hh"
#include "sim/sim_object.hh"

namespace gem5
{

class SimpleMemobj : public SimObject
{
  private:

    class CPUSidePort : public ResponsePort
    {
      private:
        SimpleMemobj *owner;  /// 拥有当前对象的对象
        bool needRetry;  	  /// Port是否需要Retry的标识
        PacketPtr blockedPacket; /// 如果发送的packet被阻塞了，就存在这里
        //很显然，这个地方只能存一个，所以足够simple。后续就可以改成队列。
        //显然这是一个阻塞式的Memory Object

      public:
		/// 调用父类构造器构造
        CPUSidePort(const std::string& name, SimpleMemobj *owner) :
            ResponsePort(name), owner(owner), needRetry(false),
            blockedPacket(nullptr)
        { }
		/**
		 * owner可以调用`sendPacket`，所有的数据流控制都在这里被处理
		 * 这里的参数是要send的packet
		 */
        void sendPacket(PacketPtr pkt);
		/**
		 * 获取owner负责的非重叠地址范围的列表。
		 * 所有响应端口都必须重写这个函数
		 * 返回一个包含至少一个项的已填充列表。
		 */
        AddrRangeList getAddrRanges() const override;
		/// 非阻塞状态时，如果需要重传，就发送retry
        void trySendRetry();

      protected:
        /// 用于atomic请求，如果来的是atomic请求，但具体的recvAtomic未实现会panic
        Tick recvAtomic(PacketPtr pkt) override
        { panic("recvAtomic unimpl."); }
		/// 这边可以联系最上面提到的三类port
        void recvFunctional(PacketPtr pkt) override;
        /// 接收timing request。返回当前对象是否处理了这个packet的bool值，如果false，调用retry
        bool recvTimingReq(PacketPtr pkt) override;
		/// sendTimingRequest调用且失败时被调用
        void recvRespRetry() override;
    };

    /// MemSidePort类似部分不再赘述
    class MemSidePort : public RequestPort
    {
      private:
        SimpleMemobj *owner;
        PacketPtr blockedPacket;

      public:
        /**
         * Constructor. Just calls the superclass constructor.
         */
        MemSidePort(const std::string& name, SimpleMemobj *owner) :
            RequestPort(name), owner(owner), blockedPacket(nullptr)
        { }
        void sendPacket(PacketPtr pkt);

      protected:
        bool recvTimingResp(PacketPtr pkt) override;
        void recvReqRetry() override;
        /**
 		 * 当从对等响应端口接收到地址范围变化时调用。默认实现会忽略该变化并且不做任何操作。
 		 * 如果owner需要知道地址范围的变化，例如在像总线这样的互连组件中，请在派生类中重写此函数。
 		 */
        void recvRangeChange() override;
    };
	
    /// 处理CPU Side请求
    bool handleRequest(PacketPtr pkt);
    /// 处理Mem Side响应
    bool handleResponse(PacketPtr pkt);
	/// Functionally 处理packet。见下注。
    void handleFunctional(PacketPtr pkt);
	/// 返回当前对象负责的地址范围
    AddrRangeList getAddrRanges() const;
	/// 告知CPU请求当前内存对象的地址范围
    void sendRangeChange();


    CPUSidePort instPort;
    CPUSidePort dataPort;

    MemSidePort memPort;

    bool blocked;

  public:

    /** constructor
     */
    SimpleMemobj(const SimpleMemobjParams &params);
    /// 给定端口名字索引获取port，主要在绑定（binding）时候调用，返回一个与协议无关的端口引用
    /// 通过端口名称和索引来检索端口，便于在系统中管理和使用端口，尤其是在复杂的硬件系统设计中。
    Port &getPort(const std::string &if_name,
                  PortID idx=InvalidPortID) override;
};

} // namespace gem5

#endif // __LEARNING_GEM5_PART2_SIMPLE_MEMOBJ_HH__
```

* `handleFunction(PacketPtr pkt)` 的作用是处理函数调用相关的包，它通常用于模拟系统调用或其他 CPU 指令发出的特殊操作。在 gem5 中，许多系统调用或者设备驱动相关的功能可能通过这种函数实现。

  * > 例如：
    >
    > ```c++
    > void handleFunction(PacketPtr pkt) {
    >     // 获取请求的地址
    >     Addr addr = pkt->getAddr();
    > 
    >     // 检查请求的类型
    >     if (pkt->isRead()) {
    >         // 处理读请求，读取数据并填充到包中
    >         pkt->setData(some_data);
    >     } else if (pkt->isWrite()) {
    >         // 处理写请求，将数据写入特定地址
    >         writeDataToAddress(addr, pkt->getData());
    >     } else if (pkt->isFuncCall()) {
    >         // 如果是一个函数调用，处理函数调用
    >         processFunctionCall(pkt);
    >     }
    > 
    >     // 标记处理完成
    >     pkt->makeResponse();
    > }
    > ```



### Step 3

接下来就需要实现Memory Object对应的功能。也就是实现`.cc`文件。

* 首先需要通过构造类构造对应的`Memory Object`。注：对应参数`SimpleMemobjParams *params`会自动生成。

  * > gem5 中使用了一种名为 **参数化构造** 的方法，通过 Python 脚本根据 `.hh` 文件生成参数类。这些脚本解析类的定义和其构造函数所需的参数，然后自动生成对应的参数类。

```c++
SimpleMemobj::SimpleMemobj(const SimpleMemobjParams &params) :
    SimObject(params),
    instPort(params.name + ".inst_port", this),
    dataPort(params.name + ".data_port", this),
    memPort(params.name + ".mem_side", this),
    blocked(false)
{
}
```

* 接下来需要实现接口以获取`port`
  * 根据参数`if_name`获取`port`（在py文件中声明），如果不匹配则会交给父类。

```c++
Port &
SimpleMemobj::getPort(const std::string &if_name, PortID idx)
{
    panic_if(idx != InvalidPortID, "This object doesn't support vector ports");

    // This is the name from the Python SimObject declaration (SimpleMemobj.py)
    if (if_name == "mem_side") {
        return memPort;
    } else if (if_name == "inst_port") {
        return instPort;
    } else if (if_name == "data_port") {
        return dataPort;
    } else {
        // pass it along to our super class
        return SimObject::getPort(if_name, idx);
    }
}
```

* 接下来分别实现`CPUSidePort`和`MemSidePor`t相应的功能
  * 值得注意的是，得区分谁是`master`，谁是`slave`。对于一个Memory Object来说，CPUSide是接收来自CPU的请求（发送响应），MemSide，是向内存侧发起请求（接收响应）。

```c++
/// 发送响应，如果失败，当前pkt存在blockedPacket里，等待稍后重试
void
SimpleMemobj::CPUSidePort::sendPacket(PacketPtr pkt)
{
    // Note: This flow control is very simple since the memobj is blocking.

    panic_if(blockedPacket != nullptr, "Should never try to send if blocked!");

    // If we can't send the packet across the port, store it for later.
    if (!sendTimingResp(pkt)) {
        blockedPacket = pkt;
    }
}

AddrRangeList
SimpleMemobj::CPUSidePort::getAddrRanges() const
{
    return owner->getAddrRanges();
}

void
SimpleMemobj::CPUSidePort::trySendRetry()
{
    if (needRetry && blockedPacket == nullptr) {
        // Only send a retry if the port is now completely free
        needRetry = false;
        DPRINTF(SimpleMemobj, "Sending retry req for %d\n", id);
        sendRetryReq();
    }
}

void
SimpleMemobj::CPUSidePort::recvFunctional(PacketPtr pkt)
{
    // Just forward to the memobj.
    return owner->handleFunctional(pkt);
}

/// 处理请求失败，返回false,后续等待重试
bool
SimpleMemobj::CPUSidePort::recvTimingReq(PacketPtr pkt)
{
    // Just forward to the memobj.
    if (!owner->handleRequest(pkt)) {
        needRetry = true;
        return false;
    } else {
        return true;
    }
}

// 只有blockedPacket有pkt才可以重试
void
SimpleMemobj::CPUSidePort::recvRespRetry()
{
    // We should have a blocked packet if this function is called.
    assert(blockedPacket != nullptr);

    // Grab the blocked packet.
    PacketPtr pkt = blockedPacket;
    blockedPacket = nullptr;

    // Try to resend it. It's possible that it fails again.
    sendPacket(pkt);
}
```

------



```c++
bool
SimpleMemobj::handleRequest(PacketPtr pkt)
{
    if (blocked) {
        return false;
    }

    DPRINTF(SimpleMemobj, "Got request for addr %#x\n", pkt->getAddr());
    blocked = true;
    memPort.sendPacket(pkt);
    return true;
}

void
SimpleMemobj::MemSidePort::sendPacket(PacketPtr pkt)
{
    // Note: This flow control is very simple since the memobj is blocking.

    panic_if(blockedPacket != nullptr, "Should never try to send if blocked!");

    // If we can't send the packet across the port, store it for later.
    if (!sendTimingReq(pkt)) {
        blockedPacket = pkt;
    }
}

bool
SimpleMemobj::MemSidePort::recvTimingResp(PacketPtr pkt)
{
    // Just forward to the memobj.
    return owner->handleResponse(pkt);
}

void
SimpleMemobj::MemSidePort::recvReqRetry()
{
    // We should have a blocked packet if this function is called.
    assert(blockedPacket != nullptr);

    // Grab the blocked packet.
    PacketPtr pkt = blockedPacket;
    blockedPacket = nullptr;

    // Try to resend it. It's possible that it fails again.
    sendPacket(pkt);
}

void
SimpleMemobj::MemSidePort::recvRangeChange()
{
    owner->sendRangeChange();
}
```

* 处理完`CPUSidePort`和`MemSidePort`后需要编写处理请求和响应的一些函数。

```c++
bool
SimpleMemobj::handleResponse(PacketPtr pkt)
{
    assert(blocked);
    DPRINTF(SimpleMemobj, "Got response for addr %#x\n", pkt->getAddr());

    // The packet is now done. We're about to put it in the port, no need for
    // this object to continue to stall.
    // We need to free the resource before sending the packet in case the CPU
    // tries to send another request immediately (e.g., in the same callchain).
    blocked = false;

    // Simply forward to the memory port
    if (pkt->req->isInstFetch()) {
        instPort.sendPacket(pkt);
    } else {
        dataPort.sendPacket(pkt);
    }

    // For each of the cpu ports, if it needs to send a retry, it should do it
    // now since this memory object may be unblocked now.
    instPort.trySendRetry();
    dataPort.trySendRetry();

    return true;
}

void
SimpleMemobj::handleFunctional(PacketPtr pkt)
{
    // Just pass this on to the memory side to handle for now.
    memPort.sendFunctional(pkt);
}

AddrRangeList
SimpleMemobj::getAddrRanges() const
{
    DPRINTF(SimpleMemobj, "Sending new ranges\n");
    // Just use the same ranges as whatever is on the memory side.
    return memPort.getAddrRanges();
}

void
SimpleMemobj::sendRangeChange()
{
    instPort.sendRangeChange();
    dataPort.sendRangeChange();
}

} // namespace gem5
```

* 这几段代码里提到的`blocked`，是一个`bool`变量。
  * `blocked`构造时默认`false`，当前Memory Object正在等待response时设置为`true`
  * `handleRequest`在`blocked`为真时不执行（返回失败）
  * `handleResponse`必须在`blocked`为真时才会执行

### CallChain Analysis

以第一次处理请求为例

![](.\p3.png)

这里不包含失败重试的部分，整体的调用链相对还是简单的。基本就是CPUSidePort接收请求，Memory Object进行处理，通过MemSidePort向MemSide发送请求。等到响应到达MemSidePort，Memory Object处理响应。随后响应CPUSide的请求（发送响应）。

![](.\p4.png)

当请求(响应)接受多的时候，就有可能出现retry。在代码中，似乎一些函数并不是在这个文件中实现的，比如`sendRetryReq`,`sendTimingReq`等等，有一些奇怪。

这里还会出现`blockedPacket`，首次赋值在`MemSidePort::sendPacket`。因为有可能请求的MemSide处于忙状态，因此MemSidePort会收到`sendTimingReq`的`false`返回值。此时，packet会被暂存在`blockedPacket`里。当MemSide结束忙碌状态，向这个MemSidePort发送重试请求时，`blockedPacket`会被置为`nullptr`，同时重新发送刚刚暂存的packet。

涉及到`sendPacket`都需要首先确保`blockedPacket`是空的，这是因为`sendPacket`是一个有可能遇到忙碌而失败的操作，因此需要存下每一次的Packet。阻塞式的Memory Object，每一个Port都有一个`blockedPacket`。

![](.\p5.png)



## Simple Cache

`cache`在gem5中也是一个Memory Object，这里是一个简单的`cache object`。

### Step 1

第一步依然是需要定义一个相应的`python`文件

```python
from m5.objects.ClockedObject import ClockedObject
from m5.params import *
from m5.proxy import *


class SimpleCache(ClockedObject):
    type = "SimpleCache"
    cxx_header = "learning_gem5/part2/simple_cache.hh"
    cxx_class = "gem5::SimpleCache"

    # Vector port example. Both the instruction and data ports connect to this
    # port which is automatically split out into two ports.
    cpu_side = VectorResponsePort("CPU side port, receives requests")
    mem_side = RequestPort("Memory side port, sends requests")

    latency = Param.Cycles(1, "Cycles taken on a hit or to resolve a miss")
    size = Param.MemorySize("16kB", "The size of the cache")
    system = Param.System(Parent.any, "The system this cache is part of")
```

> * `VectorResponsePort`
>   * 在gem5中，`VectorResponsePort` 是一种用于处理向量响应的端口，通常与多个请求响应相关联。它允许一个组件接收来自多个请求的响应，并能够以一种高效的方式将这些响应传递给相应的请求发起者。
> * `system`
>   * 这是模拟的系统，`cache`是其中的一部分



### Step 2

接下来就是定义相应的头文件

* 数据转发几乎和之前的简单的Memory Object一致，但是作为`cache`，它需要响应多核CPU请求；需要有缓存的驱逐等等。

```c++
#ifndef __LEARNING_GEM5_SIMPLE_CACHE_SIMPLE_CACHE_HH__
#define __LEARNING_GEM5_SIMPLE_CACHE_SIMPLE_CACHE_HH__

#include <unordered_map>

#include "base/statistics.hh"
#include "mem/port.hh"
#include "params/SimpleCache.hh"
#include "sim/clocked_object.hh"

namespace gem5
{
/**
 * 一个非常简单的缓存对象。具有随机替换的完全关联数据存储。
 * 此缓存是完全阻塞的（而非非阻塞）。一次只能有一个请求处于待处理状态。
 * 此缓存是写回缓存。 
 */
class SimpleCache : public ClockedObject
{
  private:
    class CPUSidePort : public ResponsePort
    {
      private:
        /// 因为这是一个向量端口，因此需要直到这个number是哪一个
        int id;
        SimpleCache *owner;
        bool needRetry;
        PacketPtr blockedPacket;

      public:
        CPUSidePort(const std::string& name, int id, SimpleCache *owner) :
            ResponsePort(name), id(id), owner(owner), needRetry(false),
            blockedPacket(nullptr)
        { }

        void sendPacket(PacketPtr pkt);
        AddrRangeList getAddrRanges() const override;
        void trySendRetry();

      protected:
        Tick recvAtomic(PacketPtr pkt) override
        { panic("recvAtomic unimpl."); }
        void recvFunctional(PacketPtr pkt) override;
        bool recvTimingReq(PacketPtr pkt) override;
        void recvRespRetry() override;
    };

    class MemSidePort : public RequestPort
    {
      private:
        SimpleCache *owner;
        PacketPtr blockedPacket;

      public:
        MemSidePort(const std::string& name, SimpleCache *owner) :
            RequestPort(name), owner(owner), blockedPacket(nullptr)
        { }
        void sendPacket(PacketPtr pkt);

      protected:
        bool recvTimingResp(PacketPtr pkt) override;
        void recvReqRetry() override;
        void recvRangeChange() override;
    };

   
    bool handleRequest(PacketPtr pkt, int port_id);
    bool handleResponse(PacketPtr pkt);
    void sendResponse(PacketPtr pkt);
    void handleFunctional(PacketPtr pkt);

 	/// 访问缓存以进行时序访问。此操作在缓存访问延迟过去后调用
    void accessTiming(PacketPtr pkt);
    bool accessFunctional(PacketPtr pkt);
    /// 将一个块插入缓存。如果缓存没有剩余空间，则此函数会随机驱逐一个条目以为新块腾出空间。
    void insert(PacketPtr pkt);
    AddrRangeList getAddrRanges() const;
    void sendRangeChange() const;
    /// 检查缓存的延迟。命中和未命中的周期数。
    const Cycles latency;
    /// 缓存的块大小
    const Addr blockSize;
    /// 缓存中的块数（缓存大小 / 块大小）
    const unsigned capacity;
    /// CPU 端口的实例化。这是一个向量，即包括了很多cpuPort
    std::vector<CPUSidePort> cpuPorts;
    MemSidePort memPort;
    /// 如果此缓存当前因等待响应而被阻塞，则为真
    bool blocked;
    /// 当前正在处理的数据包.用于升级到更大的cacheline size
    PacketPtr originalPacket;
    /// 接收到响应时用于发送响应的端口
    int waitingPortId;
    /// 用于跟踪未命中延迟
    Tick missTime;
    /// 一个非常简单的缓存存储。将块地址映射到数据
    std::unordered_map<Addr, uint8_t*> cacheStore;

    /// Cache 相关统计参数；注：请注意gem5版本，不同版本这一段会有不同
  protected:
    struct SimpleCacheStats : public statistics::Group
    {
        SimpleCacheStats(statistics::Group *parent);
        statistics::Scalar hits;
        statistics::Scalar misses;
        statistics::Histogram missLatency;
        statistics::Formula hitRatio;
    } stats;

  public:
    /** constructor
     */
    SimpleCache(const SimpleCacheParams &params);
    Port &getPort(const std::string &if_name,
                  PortID idx=InvalidPortID) override;

};

} // namespace gem5

#endif // __LEARNING_GEM5_SIMPLE_CACHE_SIMPLE_CACHE_HH__
```



### Step 3

之后就是对具体逻辑的实现，也就是对头文件的实现

```c++
SimpleCache::SimpleCache(const SimpleCacheParams &params) :
    ClockedObject(params),
    latency(params.latency),
    blockSize(params.system->cacheLineSize()),
    capacity(params.size / blockSize),
    memPort(params.name + ".mem_side", this),
    blocked(false), originalPacket(nullptr), waitingPortId(-1), stats(this)
{
    // 由于 CPU 端口是一个端口向量，因此为每个连接创建一个 CPUSidePort 的实例。
    // 该参数的成员根据向量端口的名称自动创建，并保存与此端口名称的连接数。
    for (int i = 0; i < params.port_cpu_side_connection_count; ++i) {
        cpuPorts.emplace_back(name() + csprintf(".cpu_side[%d]", i), i, this);
    }
}
```

```c++
Port &
SimpleCache::getPort(const std::string &if_name, PortID idx)
{
    // This is the name from the Python SimObject declaration in SimpleCache.py
    if (if_name == "mem_side") {
        panic_if(idx != InvalidPortID,
                 "Mem side of simple cache not a vector port");
        return memPort;
    } else if (if_name == "cpu_side" && idx < cpuPorts.size()) {
        // We should have already created all of the ports in the constructor
        return cpuPorts[idx];
    } else {
        // pass it along to our super class
        return ClockedObject::getPort(if_name, idx);
    }
}
```

```c++
void
SimpleCache::CPUSidePort::sendPacket(PacketPtr pkt)
{
    // Note: This flow control is very simple since the cache is blocking.

    panic_if(blockedPacket != nullptr, "Should never try to send if blocked!");

    // If we can't send the packet across the port, store it for later.
    DPRINTF(SimpleCache, "Sending %s to CPU\n", pkt->print());
    if (!sendTimingResp(pkt)) {
        DPRINTF(SimpleCache, "failed!\n");
        blockedPacket = pkt;
    }
}
```

```c++
AddrRangeList
SimpleCache::CPUSidePort::getAddrRanges() const
{
    return owner->getAddrRanges();
}
```

```c++
void
SimpleCache::CPUSidePort::trySendRetry()
{
    if (needRetry && blockedPacket == nullptr) {
        // Only send a retry if the port is now completely free
        needRetry = false;
        DPRINTF(SimpleCache, "Sending retry req.\n");
        sendRetryReq();
    }
}
```

```c++
void
SimpleCache::CPUSidePort::recvFunctional(PacketPtr pkt)
{
    // Just forward to the cache.
    return owner->handleFunctional(pkt);
}
```

前面的代码与之前的Memory Object几乎一致，基本不需要过多解释。下面这个与之前略有不同。额外多了一层判断。毕竟还是一个阻塞式的cache，端口存了一个请求或者还需要重试，就不能够响应请求。

```c++
bool
SimpleCache::CPUSidePort::recvTimingReq(PacketPtr pkt)
{
    DPRINTF(SimpleCache, "Got request %s\n", pkt->print());

    if (blockedPacket || needRetry) {
        // The cache may not be able to send a reply if this is blocked
        DPRINTF(SimpleCache, "Request blocked\n");
        needRetry = true;
        return false;
    }
    // Just forward to the cache.
    if (!owner->handleRequest(pkt, id)) {
        DPRINTF(SimpleCache, "Request failed\n");
        // stalling
        needRetry = true;
        return false;
    } else {
        DPRINTF(SimpleCache, "Request succeeded\n");
        return true;
    }
}
```

```c++
void
SimpleCache::CPUSidePort::recvRespRetry()
{
    // We should have a blocked packet if this function is called.
    assert(blockedPacket != nullptr);

    // Grab the blocked packet.
    PacketPtr pkt = blockedPacket;
    blockedPacket = nullptr;

    DPRINTF(SimpleCache, "Retrying response pkt %s\n", pkt->print());
    // Try to resend it. It's possible that it fails again.
    sendPacket(pkt);

    // We may now be able to accept new packets
    trySendRetry();
}
```

MemSide这边几乎没有变化。

```c++
void
SimpleCache::MemSidePort::sendPacket(PacketPtr pkt)
{
    // Note: This flow control is very simple since the cache is blocking.

    panic_if(blockedPacket != nullptr, "Should never try to send if blocked!");

    // If we can't send the packet across the port, store it for later.
    if (!sendTimingReq(pkt)) {
        blockedPacket = pkt;
    }
}
```

```c++
bool
SimpleCache::MemSidePort::recvTimingResp(PacketPtr pkt)
{
    // Just forward to the cache.
    return owner->handleResponse(pkt);
}
```

```c++
bool
SimpleCache::MemSidePort::recvTimingResp(PacketPtr pkt)
{
    // Just forward to the cache.
    return owner->handleResponse(pkt);
}

void
SimpleCache::MemSidePort::recvReqRetry()
{
    // We should have a blocked packet if this function is called.
    assert(blockedPacket != nullptr);

    // Grab the blocked packet.
    PacketPtr pkt = blockedPacket;
    blockedPacket = nullptr;

    // Try to resend it. It's possible that it fails again.
    sendPacket(pkt);
}

void
SimpleCache::MemSidePort::recvRangeChange()
{
    owner->sendRangeChange();
}
```

接下来就是SimpleCache变化新增比较多的部分了

`cache`要`handleRequest`就是处理CPU对内存的请求，而这个请求可能在cache当中，也可能不在，但还是会访问cache。而访问cache是需要时间的。因此事件的发送就需要结合访问延迟来进行调度。

这里是Simple Cache是一个阻塞式的cache，因此一次只允许一个请求执行，因此只需要保留一个port id。

```c++
bool
SimpleCache::handleRequest(PacketPtr pkt, int port_id)
{
    if (blocked) {
        // There is currently an outstanding request so we can't respond. Stall
        return false;
    }

    DPRINTF(SimpleCache, "Got request for addr %#x\n", pkt->getAddr());

    // This cache is now blocked waiting for the response to this packet.
    blocked = true;

    // Store the port for when we get the response
    assert(waitingPortId == -1);
    waitingPortId = port_id;

    // Schedule an event after cache access latency to actually access
    schedule(new EventFunctionWrapper([this, pkt]{ accessTiming(pkt); },
                                      name() + ".accessEvent", true),
             clockEdge(latency));

    return true;
}
```

cache需要处理的响应是什么呢？首先得知道cache为什么会需要接收响应。因为它发起了请求。为什么它会发起请求？因为Cache Miss了。

所以处理响应的第一步就是把packet插到cache里（假设插入是在关键路径之外，也不会导致任何的延迟）。



```c++
bool
SimpleCache::handleResponse(PacketPtr pkt)
{
    assert(blocked);
    DPRINTF(SimpleCache, "Got response for addr %#x\n", pkt->getAddr());
  
    insert(pkt);
	
    stats.missLatency.sample(curTick() - missTime);

    // If we had to upgrade the request packet to a full cache line, now we
    // can use that packet to construct the response.
    // 检查是否存在一个原始数据包，表示之前可能需要将请求升级为完整的缓存行
    if (originalPacket != nullptr) {
        DPRINTF(SimpleCache, "Copying data from new packet to old\n");
        // We had to upgrade a previous packet. We can functionally deal with
        // the cache access now. It better be a hit.
        [[maybe_unused]] bool hit = accessFunctional(originalPacket);
        panic_if(!hit, "Should always hit after inserting");
        originalPacket->makeResponse();
        delete pkt; // We may need to delay this, I'm not sure.
        pkt = originalPacket;
        originalPacket = nullptr;
    } // else, pkt contains the data it needs

    sendResponse(pkt);

    return true;
}
```

Cache需要响应不同的CPU请求，因此需要根据等待响应的CPU的端口号来发送数据包。必须要始终记得对Cache的请求可能来自不同的CPU。

```c++
void SimpleCache::sendResponse(PacketPtr pkt)
{
    assert(blocked);
    DPRINTF(SimpleCache, "Sending resp for addr %#x\n", pkt->getAddr());

    int port = waitingPortId;

    // The packet is now done. We're about to put it in the port, no need for
    // this object to continue to stall.
    // We need to free the resource before sending the packet in case the CPU
    // tries to send another request immediately (e.g., in the same callchain).
    blocked = false;
    waitingPortId = -1;

    cpuPorts[port].sendPacket(pkt);

    for (auto& port : cpuPorts) {
        port.trySendRetry();
    }
}
```

```c++
void
SimpleCache::handleFunctional(PacketPtr pkt)
{
    if (accessFunctional(pkt)) {
        pkt->makeResponse();
    } else {
        memPort.sendFunctional(pkt);
    }
}
```

### accessTiming

单独摘出来的函数，是Simple Memory Object所没有的。

这段代码是 `SimpleCache` 类中的 `accessTiming` 方法，负责处理对缓存的访问请求，决定是命中还是未命中，并相应地处理数据包

```c++
void
SimpleCache::accessTiming(PacketPtr pkt)
{
    // 调用 accessFunctional 方法检查请求是否命中。如果命中，hit 为 true，否则为 false。
    bool hit = accessFunctional(pkt);

    DPRINTF(SimpleCache, "%s for packet: %s\n", hit ? "Hit" : "Miss",
            pkt->print());
	// 处理命中情况
    if (hit) {
        // Respond to the CPU side
        stats.hits++; // update stats
        // 使用 DDUMP 打印数据包的内容
        DDUMP(SimpleCache, pkt->getConstPtr<uint8_t>(), pkt->getSize());
        pkt->makeResponse();
        sendResponse(pkt);
    } else {// 处理未命中情况
        stats.misses++; // update stats
        // 记录未命中的时间 missTime
        missTime = curTick();
        // 转发到内存侧
        // 数据包不能直接转发的原因是数据大小不一定的cacheline大小，也不一定对齐
        // 获取请求的地址和块地址
        Addr addr = pkt->getAddr();
        Addr block_addr = pkt->getBlockAddr(blockSize);
        unsigned size = pkt->getSize();
        // 检查请求是否对齐且大小是否与缓存块大小相同
        if (addr == block_addr && size == blockSize) {
            // 起始地址相同，边界对齐且大小相同才可以直接转发
            DPRINTF(SimpleCache, "forwarding packet\n");
            memPort.sendPacket(pkt);
        } else { 
            DPRINTF(SimpleCache, "Upgrading packet to block size\n");
            // 不能够处理跨cache line的访问
            panic_if(addr - block_addr + size > blockSize,
                     "Cannot handle accesses that span multiple cache lines");
            assert(pkt->needsResponse());
            MemCmd cmd;
            // 这里为什么是这么写呢？这是因为首先代码走到这里是cache miss的状态。
            // CPU要么是取数据要么是改数据
            // 但是代码希望的是即使是改数据也是在cache里修改，即把内存数据读到cache里再改
            // 因此把命令都修改成读请求
            if (pkt->isWrite() || pkt->isRead()) {
                cmd = MemCmd::ReadReq;
            } else {
                panic("Unknown packet type in upgrade size");
            }

            // Create a new packet that is blockSize
            PacketPtr new_pkt = new Packet(pkt->req, cmd, blockSize);
            new_pkt->allocate();

            // Should now be block aligned
            assert(new_pkt->getAddr() == new_pkt->getBlockAddr(blockSize));

            // Save the old packet xxx???
            originalPacket = pkt;

            DPRINTF(SimpleCache, "forwarding packet\n");
            memPort.sendPacket(new_pkt);
        }
    }
}
```

### accessFunctional 

负责处理对缓存的功能性访问请求

获取请求的地址 -> 在cache哈希表（k:v=Addr，data）里找 -> 然后根据读还是写进行相应操作

```c++
bool
SimpleCache::accessFunctional(PacketPtr pkt)
{
    Addr block_addr = pkt->getBlockAddr(blockSize);
    auto it = cacheStore.find(block_addr);
    if (it != cacheStore.end()) {
        if (pkt->isWrite()) {
            // Write the data into the block in the cache
            pkt->writeDataToBlock(it->second, blockSize);
        } else if (pkt->isRead()) {
            // Read the data out of the cache block into the packet
            pkt->setDataFromBlock(it->second, blockSize);
        } else {
            panic("Unknown packet type!");
        }
        return true;
    }
    return false;
}
```

### insert

这段代码负责将响应数据包插入到缓存中。如果缓存已满，它会随机选择一个块进行驱逐，并将其数据写回内存。

```c++
void
SimpleCache::insert(PacketPtr pkt)
{
    // 地址需要对齐
    assert(pkt->getAddr() ==  pkt->getBlockAddr(blockSize));
    // 需要insert的数据肯定不能在cache当中
    assert(cacheStore.find(pkt->getAddr()) == cacheStore.end());
    // packet需要是一个响应的数据包
    assert(pkt->isResponse());
	// cache满了，需要evict
    if (cacheStore.size() >= capacity) {
        // Select random thing to evict. This is a little convoluted since we
        // are using a std::unordered_map. See http://bit.ly/2hrnLP2
        // 随机选择一个桶（bucket），并从中随机选择一个block进行驱逐。见下注。
        int bucket, bucket_size;
        do {
            bucket = random_mt.random(0, (int)cacheStore.bucket_count() - 1);
        } while ( (bucket_size = cacheStore.bucket_size(bucket)) == 0 );
        auto block = std::next(cacheStore.begin(bucket),
                               random_mt.random(0, bucket_size - 1));

        DPRINTF(SimpleCache, "Removing addr %#x\n", block->first);

        // 创建一个请求数据包，将驱逐的块数据写回内存
        // 需要一个请求的指针，请求的命令类型，请求的大小，请求的数据指针
        RequestPtr req = std::make_shared<Request>(
            block->first, blockSize, 0, 0);
        PacketPtr new_pkt = new Packet(req, MemCmd::WritebackDirty, blockSize);
        new_pkt->dataDynamic(block->second); // This will be deleted later

        DPRINTF(SimpleCache, "Writing packet back %s\n", pkt->print());
        // Send the write to memory
        memPort.sendPacket(new_pkt);
		
        // Delete this entry
        cacheStore.erase(block->first);
    }

    DPRINTF(SimpleCache, "Inserting %s\n", pkt->print());
    DDUMP(SimpleCache, pkt->getConstPtr<uint8_t>(), blockSize);

    // 分配
    uint8_t *data = new uint8_t[blockSize];
    // 插入到cache哈希表
    cacheStore[pkt->getAddr()] = data;
    // 写入数据
    pkt->writeDataToBlock(data, blockSize);
}
```

> 详细介绍上述的随机剔除代码
>
> ```c++
> int bucket, bucket_size;
> do {
>     bucket = random_mt.random(0, (int)cacheStore.bucket_count() - 1);
> } while ((bucket_size = cacheStore.bucket_size(bucket)) == 0);
> auto block = std::next(cacheStore.begin(bucket), random_mt.random(0, bucket_size - 1));
> ```
>
> * `bucket`：用来存储随机选择的桶的索引。
>
> * `bucket_size`：用来存储所选桶中的条目数量。
> * `random_mt.random(0, (int)cacheStore.bucket_count() - 1)`
>   * 从 `cacheStore` 中获取桶的总数量（`bucket_count()`），然后随机生成一个从 `0` 到 `bucket_count() - 1` 的整数。这个整数表示桶的索引。
>   * `random_mt` 是一个随机数生成器
> * `while ((bucket_size = cacheStore.bucket_size(bucket)) == 0)`
>   * `bucket_size = cacheStore.bucket_size(bucket)` 获取当前随机选择的桶中条目的数量
>   * 如果 `bucket_size` 为 `0`，说明该桶是空的，进入 `while` 循环，继续生成新的桶索引，直到找到一个非空的桶
>   * 这确保了我们最终选择的桶中至少有一个block可以驱逐
> * `auto block = std::next(cacheStore.begin(bucket), random_mt.random(0, bucket_size - 1));`
>   * `cacheStore.begin(bucket)`:获取选定桶的迭代器（指向该桶的第一个条目）
>   * `random_mt.random(0, bucket_size - 1)`: 随机生成一个从 `0` 到 `bucket_size - 1` 的整数，表示在当前桶中的随机条目的索引
>   * `std::next(...)`
>     * `std::next` 函数接受一个迭代器和一个偏移量，返回指向桶中指定位置的迭代器。
>     * 这段代码通过 `std::next` 从桶的开始位置移动到随机选择的条目，获取对应的块（`block`）

```c++
AddrRangeList
SimpleCache::getAddrRanges() const
{
    DPRINTF(SimpleCache, "Sending new ranges\n");
    // Just use the same ranges as whatever is on the memory side.
    return memPort.getAddrRanges();
}

void
SimpleCache::sendRangeChange() const
{
    for (auto& port : cpuPorts) {
        port.sendRangeChange();
    }
}

// 统计输出
SimpleCache::SimpleCacheStats::SimpleCacheStats(statistics::Group *parent)
      : statistics::Group(parent),
      ADD_STAT(hits, statistics::units::Count::get(), "Number of hits"),
      ADD_STAT(misses, statistics::units::Count::get(), "Number of misses"),
      ADD_STAT(missLatency, statistics::units::Tick::get(),
               "Ticks for misses to the cache"),
      ADD_STAT(hitRatio, statistics::units::Ratio::get(),
               "The ratio of hits to the total accesses to the cache",
               hits / (hits + misses))
{
    missLatency.init(16); // number of buckets
}
```

