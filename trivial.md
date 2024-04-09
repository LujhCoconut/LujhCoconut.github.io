# 杂记

## 内存的非确定读取

内存的非确定读取（Non-Deterministic Read of Memory）是指在计算机系统中，由于某些因素的影响，导致对内存中的数据进行读取时，无法确定读取到的值。通常情况下，程序执行时，读取内存应当是确定的，即每次读取都应该得到相同的结果。然而，在一些情况下，由于多种因素的影响，可能导致读取到的值是不确定的，即可能会出现不同的结果。

造成内存的非确定读取可能的因素包括：

1. 并发访问：多线程或多进程同时访问同一块内存区域，由于并发访问的不确定性，可能导致读取的值不确定。
2. 硬件故障：硬件故障可能导致内存读取操作出现异常，无法确定读取到的值。
3. 软件错误：程序中的错误逻辑或漏洞可能导致内存读取操作出现异常，无法确定读取到的值。
4. 随机性：某些情况下，特定的内存读取操作可能受到外部随机事件的影响，导致读取的值不确定。

在编程和系统设计中，需要注意处理这种非确定性读取的情况，以确保系统的可靠性和稳定性。常见的做法包括使用同步机制确保并发访问的正确性，进行硬件和软件的容错处理，以及设计健壮的算法和程序逻辑来应对可能的异常情况。



## 内存的突发传输

在计算机系统中，内存的 突发传输(Burst)通常指的是一种内存访问模式，其中在连续地址上进行多个数据传输或操作。这种连续传输通常是由于内存控制器或处理器发出的单个请求引起的。Burst传输可以在存储器总线上提高数据传输速度，因为它允许在一次传输中传输多个数据块，减少了地址和控制信息之间的间隔。

Burst传输通**常用于缓存控制器和内存控制器之间的通信**，以提高数据传输的效率。当处理器请求缓存中不存在的数据时，缓存控制器可能会通过一个单独的请求从内存中获取连续的数据块，而不是逐个请求每个数据。这样一来，就可以通过单个请求进行多个数据的传输，从而更有效地利用存储器总线的带宽。

Burst传输**有助于减少存储器访问的延迟，并提高数据传输的吞吐量**。它在许多现代计算机系统中被广泛应用，特别是在高性能系统中，其中对内存带宽和效率的要求很高。



## 内存数据包

在计算机系统中，"memory packets"（内存数据包）通常指的是将数据从处理器或者其他设备发送到内存或者从内存接收的数据块。这些数据包包含了需要在内存之间传输的数据以及与传输相关的控制信息。

内存数据包可以是单个数据块，也可以是一组连续的数据块。它们通常通过系统的总线或者其他通信介质进行传输。内存数据包的大小和格式可以根据系统的设计和要求而异，通常受到系统的架构、总线带宽、延迟和处理器的支持能力等因素的影响。

在现代计算机系统中，内存数据包的传输通常是由内存控制器或者其他专门的硬件模块管理的。这些硬件模块负责将处理器或其他设备生成的内存访问请求转换为适当的内存数据包，并将其发送到内存模块以执行读取或写入操作。同时，它们还负责接收来自内存模块的响应，并将响应数据传送回请求发起者。

总的来说，内存数据包是在计算机系统中用于在处理器、内存控制器和内存模块之间传输数据的一种基本单位，它们的高效传输对于系统的性能和响应时间至关重要。



## FR-FCFS内存调度策略

"FR-FCFS"是一种内存调度策略，全称是"First-Ready First-Come First-Serve"。这种策略通常用于内存控制器中，特别是在DRAM（动态随机存取存储器）等内存类型中。

在FR-FCFS策略中，"First-Ready"表示**优先考虑那些已经就绪且等待被服务**的请求。"First-Come First-Serve"表示在就绪请求中，优先选择最早到达内存控制器的请求。这意味着，如果有多个请求就绪并等待服务，FR-FCFS策略会优先选择最早到达的请求，按照先来先服务的原则进行服务。

FR-FCFS策略的优点是简单易实现，因为它只需要根据请求到达的时间顺序进行调度，不需要复杂的优先级或其他调度算法。但是，它可能存在的缺点是，它可能无法充分利用系统资源，因为它仅仅根据请求到达的时间顺序进行服务，而不考虑请求的优先级或其他因素。

总的来说，FR-FCFS策略是一种简单且有效的内存调度策略，适用于一些对内存服务顺序没有严格要求的场景。



## \<Coding> std::tie

`std::tie` 是 C++ 标准库 `<tuple>` 头文件中提供的一个函数模板。它允许将多个变量绑定到一个 std::tuple，或者从 std::tuple 中提取值。

`std::tie` 的用途通常是将多个变量捆绑在一起，以便以一种方便的方式同时返回它们，或者从一个 std::tuple 中解包值。它可以用于多种情况，例如从函数返回多个值，或者在某些算法中，需要对多个值进行操作。

以下是 `std::tie` 的一些常见用法：

1. 从 std::tuple 中解包值：

   ```c++
   std::tuple<int, double> myTuple(10, 3.14);
   int a;
   double b;
   std::tie(a, b) = myTuple;
   // 现在 a = 10, b = 3.14
   ```

2. 在函数中返回多个值：

   ```c++
   std::tuple<int, double> myFunction() {
       int a = 10;
       double b = 3.14;
       return std::make_tuple(a, b);
   }
   
   // 调用函数并获取返回值
   int x;
   double y;
   std::tie(x, y) = myFunction();
   ```

3. 比较元组（lexicographical comparison）：

   ```c++
   std::tuple<int, double> tuple1(10, 3.14);
   std::tuple<int, double> tuple2(20, 6.28);
   if (std::tie(tuple1) < std::tie(tuple2)) {
       // tuple1 按照字典序小于 tuple2
   }
   ```

通过使用 `std::tie`，可以**方便地处理多个变量的相关操作，使代码更清晰、更简洁。**



## \<Coding> std::make_pair

`std::make_pair` 是 C++ 标准库中 `<utility>` 头文件中提供的一个模板函数，用于**创建一个 `std::pair` 对象**。

`std::pair` 是一个模板类，表示**两个值的有序对**。`std::make_pair` 可以方便地创建一个 `std::pair` 对象，并自动推导模板参数的类型。

以下是 `std::make_pair` 的用法示例：

```c++
#include <iostream>
#include <utility>

int main() {
    // 使用 std::make_pair 创建一个 std::pair 对象
    std::pair<int, double> myPair = std::make_pair(10, 3.14);
    
    // 可以使用 myPair 的成员函数或者访问其 public 成员变量 first 和 second
    std::cout << "First element: " << myPair.first << std::endl;
    std::cout << "Second element: " << myPair.second << std::endl;

    return 0;
}
```

在这个例子中，`std::make_pair(10, 3.14)` 创建了一个包含整数 10 和双精度浮点数 3.14 的 `std::pair` 对象。由于 `std::make_pair` 推导参数类型，因此可以轻松地创建不同类型的有序对。

使用 `std::make_pair` 可以减少代码的冗余，并提高代码的可读性和可维护性。





## 【ChatGPT】模拟混合内存示例代码

```c++
// multi_memory_controller.hh

#ifndef __MULTI_MEMORY_CONTROLLER_HH__
#define __MULTI_MEMORY_CONTROLLER_HH__

#include "base/addr_range_map.hh"
#include "mem/abstract_mem.hh"
#include "mem/mem_object.hh"
#include "sim/eventq.hh"
#include <queue>

class MultiMemoryController : public AbstractMemory, public MemObject {
public:
    MultiMemoryController(const MultiMemoryControllerParams *params);
    ~MultiMemoryController();

    void sendRequest(PacketPtr pkt) override;

protected:
    void init();

private:
    std::vector<AbstractMemory*> memories;
    AddrRangeMap<AbstractMemory*> rangeMap;

    // 添加队列用于排队
    std::queue<PacketPtr> queue;

    // 添加重试机制
    void retry();

    // 添加调度算法
    enum SchedulingPolicy {
        FIFO,
        FRFCFS
    } schedulingPolicy;
};

#endif // __MULTI_MEMORY_CONTROLLER_HH__

```

```c++
// multi_memory_controller.cc

#include "mem/multi_memory_controller.hh"
#include "sim/system.hh"

MultiMemoryController::MultiMemoryController(const MultiMemoryControllerParams *params) :
    AbstractMemory(params),
    MemObject(params)
{
    schedulingPolicy = params->scheduling_policy;
    init();
}

MultiMemoryController::~MultiMemoryController()
{
    for (auto mem : memories)
        delete mem;
}

void MultiMemoryController::init()
{
    // 添加内存模块，这里假设有两个内存模块
    memories.push_back(new DRAM(params()->dram_range));
    memories.push_back(new NVM(params()->nvm_range));

    // 将内存模块添加到地址范围映射中
    rangeMap.addRange(params()->dram_range, memories[0]);
    rangeMap.addRange(params()->nvm_range, memories[1]);
}

void MultiMemoryController::sendRequest(PacketPtr pkt)
{
    // 如果队列不为空，根据调度策略处理队列中的请求
    if (!queue.empty()) {
        switch (schedulingPolicy) {
            case FIFO:
                queue.push(pkt);
                break;
            case FRFCFS:
                // 实现 FRFCFS 调度算法
                // FRFCFS 的具体逻辑略微复杂，需要考虑请求的行缓冲命中情况等，这里只是简单示意
                if (pkt->isRead()) {
                    queue.push(pkt);
                } else {
                    retry();
                }
                break;
        }
    } else { // 如果队列为空，直接发送请求到内存模块
        AbstractMemory *mem = rangeMap.find(pkt->getAddr());

        if (mem == nullptr) {
            warn("No memory controller found for address %lx\n", pkt->getAddr());
            return;
        }

        // 发送请求到对应的内存模块
        mem->sendPacket(pkt);
    }
}

void MultiMemoryController::retry()
{
    // 实现重试机制，这里只是简单示意，可以根据实际情况进行扩展
    if (!queue.empty()) {
        PacketPtr pkt = queue.front();
        queue.pop();
        sendRequest(pkt);
    }
}

MultiMemoryController*
MultiMemoryControllerParams::create()
{
    return new MultiMemoryController(this);
}

```

> 实现似乎过于简单了,gem5最新版本中的HeteroMemCtrl复杂得多