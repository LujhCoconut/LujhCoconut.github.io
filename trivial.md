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



## 【自己实现】HBM+DDR混合内存代码

```c++
/*
 * Copyright (c) 2010-2020 ARM Limited
 * All rights reserved
 *
 * The license below extends only to copyright in the software and shall
 * not be construed as granting a license to any other intellectual
 * property including but not limited to intellectual property relating
 * to a hardware implementation of the functionality of the software
 * licensed hereunder.  You may use the software subject to the license
 * terms below provided that you ensure that this notice is replicated
 * unmodified and in its entirety in all distributions of the software,
 * modified or unmodified, in source code or in binary form.
 *
 * Copyright (c) 2013 Amin Farmahini-Farahani
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met: redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer;
 * redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution;
 * neither the name of the copyright holders nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#include "mem/hetero_mem_ctrl.hh"

#include "base/trace.hh"
#include "debug/DRAM.hh"
#include "debug/Drain.hh"
#include "debug/MemCtrl.hh"
#include "debug/NVM.hh"
#include "debug/QOS.hh"
#include "debug/HeteroMemCtrl.hh"
#include "mem/dram_interface.hh"
#include "mem/mem_interface.hh"
#include "mem/nvm_interface.hh"
#include "sim/system.hh"

namespace gem5
{

namespace memory
{
/**
 * 异构内存初始化 接收p对象的所有参数
 * 本实例中HeteroMemCtrl继承MemCtrl，自带一个dram成员类
 * dram指DDR hbm指HBM 都是DRAMInterface* 类型
*/
HeteroMemCtrl::HeteroMemCtrl(const HeteroMemCtrlParams &p) :
    MemCtrl(p),
    hbm(p.hbm)
{
    DPRINTF(HeteroMemCtrl, "Setting up controller\n");
    readQueue.resize(p.qos_priorities);
    writeQueue.resize(p.qos_priorities);

    fatal_if(dynamic_cast<DRAMInterface*>(dram) == nullptr,
            "HeteroMemCtrl's dram interface must be of type DRAMInterface.\n");
    fatal_if(dynamic_cast<DRAMInterface*>(hbm) == nullptr,
            "HeteroMemCtrl's hbm interface must be of type DRAMInterface.\n");

    // hook up interfaces to the controller
    dram->setCtrl(this, commandWindow);
    hbm->setCtrl(this, commandWindow);

    readBufferSize = dram->readBufferSize + hbm->readBufferSize;
    writeBufferSize = dram->writeBufferSize + hbm->writeBufferSize;

    writeHighThreshold = writeBufferSize * p.write_high_thresh_perc / 100.0;
    writeLowThreshold = writeBufferSize * p.write_low_thresh_perc / 100.0;

    // perform a basic check of the write thresholds
    if (p.write_low_thresh_perc >= p.write_high_thresh_perc)
        fatal("Write buffer low threshold %d must be smaller than the "
              "high threshold %d\n", p.write_low_thresh_perc,
              p.write_high_thresh_perc);
}

/**
 * recvAtomic函数确定一个内存访问请求由哪种内存类型来处理，
 * 并调用相应的内存控制器的recvAtomicLogic函数来处理请求
 * 本例中：用于判断数据包是来自DRAM还是HBM，并据此确定处理请求延迟的时间
*/
Tick
HeteroMemCtrl::recvAtomic(PacketPtr pkt)
{
    Tick latency = 0;

    if (dram->getAddrRange().contains(pkt->getAddr())) {
        latency = MemCtrl::recvAtomicLogic(pkt, dram);
    } else if (hbm->getAddrRange().contains(pkt->getAddr())) {
        latency = MemCtrl::recvAtomicLogic(pkt, hbm);
    } else {
        panic("Can't handle address range for packet %s\n", pkt->print());
    }

    return latency;
}


/**
 * 用于处理内存控制器接收到的定时请求（timing request）
 * 计算一个请求和当前请求之间的平均间隔
 * 根据请求来自DRAM或者HBM确定内存突发传输大小 并根据请求大小 转换成一定数量的数据包
*/
bool
HeteroMemCtrl::recvTimingReq(PacketPtr pkt)
{
    // This is where we enter from the outside world
    DPRINTF(HeteroMemCtrl, "recvTimingReq: request %s addr %#x size %d\n",
            pkt->cmdString(), pkt->getAddr(), pkt->getSize());

    panic_if(pkt->cacheResponding(), "Should not see packets where cache "
             "is responding");

    panic_if(!(pkt->isRead() || pkt->isWrite()),
             "Should only see read and writes at memory controller\n");

    // 计算上一个请求到达和当前请求之间的平均间隔时间，用于统计平均请求间隔
    if (prevArrival != 0) {
        stats.totGap += curTick() - prevArrival;
    }
    prevArrival = curTick();

    // 判断请求访问的地址范围属于DRAM还是HBM，并设置相应的标志位。
    bool is_dram;
    if (dram->getAddrRange().contains(pkt->getAddr())) {
        is_dram = true;
    } else if (hbm->getAddrRange().contains(pkt->getAddr())) {
        is_dram = false;
    } else {
        panic("Can't handle address range for packet %s\n",
              pkt->print());
    }

    // 根据请求的大小和内存控制器的突发大小，计算出请求需要转换成多少个内存传输包。
    unsigned size = pkt->getSize();
    uint32_t burst_size = is_dram ? dram->bytesPerBurst() :
                                    hbm->bytesPerBurst();
    unsigned offset = pkt->getAddr() & (burst_size - 1);
    unsigned int pkt_count = divCeil(offset + size, burst_size);

    /**
     * Notes： divCeil是一个函数调用，它的作用是进行整数除法，并将结果向上取整到最接近的整数。通常用于计算除法结果的上取整。
     * 在内存控制器的实现中，这种计算方式常常用于确定请求需要转换成多少个内存传输包
     * 以便适应内存系统的传输单位大小（例如，内存控制器的突发大小）。
    */

    // 调用qosSchedule函数执行QoS调度，并为请求分配一个QoS优先级值。
    qosSchedule( { &readQueue, &writeQueue }, burst_size, pkt);

    /* 检查本地缓冲区是否已满 */
    // 如果是写请求
    if (pkt->isWrite()) {
        assert(size != 0);
        /* 如果写请求队列已满，则设置retryWrReq为真，表示需要重试该端口；否则将请求添加到写请求队列中，并增加相关的统计信息。 */
        if (writeQueueFull(pkt_count)) {
            DPRINTF(HeteroMemCtrl, "Write queue full, not accepting\n");
            retryWrReq = true;
            stats.numWrRetry++;
            return false;
        } else {
            addToWriteQueue(pkt, pkt_count, is_dram ? dram : hbm);
            // 如果我们还没有计划将请求从队列中取出，就立即执行
            if (!nextReqEvent.scheduled()) {
                DPRINTF(HeteroMemCtrl, "Request scheduled immediately\n");
                schedule(nextReqEvent, curTick());
            }
            stats.writeReqs++;
            stats.bytesWrittenSys += size;
        }
    }
    // 如果是读请求 
    else {
        assert(pkt->isRead());
        assert(size != 0);
        /* 检查读请求队列是否已满，如果已满，则设置retryRdReq为真，表示需要重试该端口；否则将请求添加到读请求队列中，并增加相关的统计信息。 */
        if (readQueueFull(pkt_count)) {
            DPRINTF(HeteroMemCtrl, "Read queue full, not accepting\n");
            retryRdReq = true;
            stats.numRdRetry++;
            return false;
        } else {
            if (!addToReadQueue(pkt, pkt_count, is_dram ? dram : hbm)) {
                // 如果我们还没有计划将请求从队列中取出，就立即执行
                if (!nextReqEvent.scheduled()) {
                    DPRINTF(HeteroMemCtrl, "Request scheduled immediately\n");
                    schedule(nextReqEvent, curTick());
                }
            }
            stats.readReqs++;
            stats.bytesReadSys += size;
        }
    }
    /* 根据请求的类型（读或写）返回相应的布尔值，表示请求是否成功处理 */
    return true;
}

/**
 * processRespondEvent：用于处理内存控制器接收到的响应事件
 * @param mem_intr 指向内存接口的指针，用于标识是DRAM还是HBM的响应事件
 * @param queue 表示要处理的请求队列，是一个MemPacketQueue类型的引用
 * @param resp_event 一个EventFunctionWrapper类型的引用，表示要执行的响应事件
 * @param retry_rd_req 一个布尔引用，表示是否需要重试读请求
*/
void
HeteroMemCtrl::processRespondEvent(MemInterface* mem_intr,
                        MemPacketQueue& queue,
                        EventFunctionWrapper& resp_event,
                        bool& retry_rd_req)
{
    DPRINTF(HeteroMemCtrl,
            "processRespondEvent(): Some req has reached its readyTime\n");
    /* 根据当前请求队列中队首请求的内存类型（DRAM或HBM），选择对应的内存控制器（dram或hbm）来处理响应事件 */
    if (queue.front()->isDram()) {
        MemCtrl::processRespondEvent(dram, queue, resp_event, retry_rd_req);
    } else {
        MemCtrl::processRespondEvent(hbm, queue, resp_event, retry_rd_req);
    }
}

/**
 * chooseNext:用于在内存控制器中进行请求的调度（arbitration）
*/
MemPacketQueue::iterator
HeteroMemCtrl::chooseNext(MemPacketQueue& queue, Tick extra_col_delay,
                    MemInterface* mem_int)
{
    /* 定义一个迭代器ret，初始化为队列的末尾位置，用于记录选择的下一个请求。 */
    MemPacketQueue::iterator ret = queue.end();
    // 检查请求队列是否为空，如果不为空则进行调度
    if (!queue.empty()) {
        // 如果队列中只有一个请求，则不需要进行调度，直接选择这个请求。
        if (queue.size() == 1) {
            // available rank corresponds to state refresh idle
            // 获取队列中第一个请求，并判断其是否准备好发送给内存模块。
            MemPacket* mem_pkt = *(queue.begin());
            // 检查请求是否准备好发送给内存模块。根据请求所属的内存类型（DRAM或HBM），调用packetReady函数进行判断。
            if (packetReady(mem_pkt, mem_pkt->isDram()? dram : hbm)) {
                // 如果请求准备好发送给内存模块，则将其选择为下一个处理的请求
                ret = queue.begin();
                DPRINTF(HeteroMemCtrl, "Single request, going to a free rank\n");
            } else {
                DPRINTF(HeteroMemCtrl, "Single request, going to a busy rank\n");
            }
        } 
        // 如果队列中有多个请求，并且调度策略是先来先服务（FCFS），则按照先来先服务的原则选择下一个请求
        else if (memSchedPolicy == enums::fcfs) {
            // check if there is a packet going to a free rank
            // 遍历请求队列中的所有请求，查找可以立即发送给内存模块的请求
            for (auto i = queue.begin(); i != queue.end(); ++i) {
                MemPacket* mem_pkt = *i;
                if (packetReady(mem_pkt, mem_pkt->isDram()? dram : hbm)) {
                    ret = i;
                    break;
                }
            }
        } 
        // 如果调度策略是FR-FCFS，则调用chooseNextFRFCFS函数进行选择
        else if (memSchedPolicy == enums::frfcfs) {
            Tick col_allowed_at;
            std::tie(ret, col_allowed_at)
                    = chooseNextFRFCFS(queue, extra_col_delay, mem_int);
        }
        // 如果没有选择任何调度策略，则发生错误
        else {
            panic("No scheduling policy chosen\n");
        }
    }
    return ret;
}


/**
 * chooseNextFRFCFS:用于在FR-FCFS调度策略下选择下一个处理的请求
*/
std::pair<MemPacketQueue::iterator, Tick>
HeteroMemCtrl::chooseNextFRFCFS(MemPacketQueue& queue, Tick extra_col_delay,
                          MemInterface* mem_intr)
{
    /* 定义了两个迭代器 分别用于记录选择的DRAM和HBM请求 */
    auto selected_pkt_it = queue.end();
    auto hbm_pkt_it = queue.end();
    /* 定义了两个变量 分别用于记录DRAM请求和HBM请求可发出的时间 初始值均为最大时钟周期 */
    Tick col_allowed_at = MaxTick;
    Tick hbm_col_allowed_at = MaxTick;

    /* 选择DRAM队列中下一个处理的请求，并将选择的请求和其可发出的时间赋值给selected_pkt_it，selected_pkt_it */
    std::tie(selected_pkt_it, col_allowed_at) =
            MemCtrl::chooseNextFRFCFS(queue, extra_col_delay, dram);
    /* 选择HBM队列中下一个处理的请求，并将选择的请求和其可发出的时间赋值给hbm_pkt_it，hbm_col_allowed_at */
    std::tie(hbm_pkt_it, hbm_col_allowed_at) =
            MemCtrl::chooseNextFRFCFS(queue, extra_col_delay, hbm);


    /**
     * 比较DRAM请求和HBM请求的可发出时间，如果HBM请求可发出的时间早于DRAM请求，
     * 则选择HBM请求作为下一个处理的请求，并更新相应的可发出时间。
    */
    if (col_allowed_at > hbm_col_allowed_at) {
        selected_pkt_it = hbm_pkt_it;
        col_allowed_at = hbm_col_allowed_at;
    }
    // 返回一个std::pair，包含选中的请求迭代器和其可发出的时间。
    return std::make_pair(selected_pkt_it, col_allowed_at);
}

/**
 * doBurstAccess：用于执行内存访问的突发操作
*/
Tick
HeteroMemCtrl::doBurstAccess(MemPacket* mem_pkt, MemInterface* mem_intr)
{
    // mem_intr will be dram by default in HeteroMemCtrl

    // 定义一个名为cmd_at的变量，用于记录命令的执行时间
    Tick cmd_at;
    // 判断mem_pkt所属的内存类型是DRAM还是HBM
    if (mem_pkt->isDram()) {
        // 调用MemCtrl::doBurstAccess函数执行DRAM的突发访问操作，并将命令的执行时间赋值给cmd_at变量。
        cmd_at = MemCtrl::doBurstAccess(mem_pkt, mem_intr);
        // 更新HBM内存接口的相关时间参数，确保DRAM和HBM的时序同步。
        hbm->addRankToRankDelay(cmd_at);
        hbm->nextBurstAt = dram->nextBurstAt;
        hbm->nextReqTime = dram->nextReqTime;

    } else {
        // 调用MemCtrl::doBurstAccess函数执行HBM的突发访问操作，并将命令的执行时间赋值给cmd_at变量。
        cmd_at = MemCtrl::doBurstAccess(mem_pkt, hbm);
        // 更新DRAM内存接口的相关时间参数，确保DRAM和HBM的时序同步。
        dram->addRankToRankDelay(cmd_at);
        dram->nextBurstAt = hbm->nextBurstAt;
        dram->nextReqTime = hbm->nextReqTime;
    }
    // 返回命令的执行时间
    return cmd_at;
}

/**
 * memBusy: 用于判断内存控制器是否处于繁忙状态
 * @param mem_intr mem_intr参数始终指向DRAM接口
*/
bool
HeteroMemCtrl::memBusy(MemInterface* mem_intr) {

    // mem_intr in case of HeteroMemCtrl will always be dram

    // check ranks for refresh/wakeup - uses busStateNext, so done after
    // turnaround decisions
    // Default to busy status and update based on interface specifics
    // 表示默认情况下HBM接口为繁忙状态
    bool dram_busy, hbm_busy = true;
    // 检查DRAM接口是否处于繁忙状态，并将结果赋值给dram_busy变量
    dram_busy = mem_intr->isBusy(false, false);
    // 计算HBM接口的读请求队列是否为空
    // 以及所有写请求是否都在HBM接口的写请求队列中。
    bool read_queue_empty = totalReadQueueSize == 0;
    bool all_writes_hbm = hbm->numWritesQueued == totalWriteQueueSize;
    // 据读请求队列是否为空和所有写请求是否都在写请求队列中来检查HBM接口是否处于繁忙状态
    hbm_busy = hbm->isBusy(read_queue_empty, all_writes_hbm);

    // Default state of unused interface is 'true'
    // Simply AND the busy signals to determine if system is busy
    // 如果DRAM接口和HBM接口都处于繁忙状态，则返回true，
    // 表示内存控制器处于繁忙状态；否则返回false，表示内存控制器不处于繁忙状态。
    if (dram_busy && hbm_busy) {
        // if all ranks are refreshing wait for them to finish
        // and stall this state machine without taking any further
        // action, and do not schedule a new nextReqEvent
        return true;
    } else {
        return false;
    }
}

/**
 * Notes:通常情况下，程序执行时，读取内存应当是确定的，
 * 即每次读取都应该得到相同的结果。
 * 然而，在一些情况下，由于多种因素的影响，
 * 可能导致读取到的值是不确定的，即可能会出现不同的结果。
*/
void
HeteroMemCtrl::nonDetermReads(MemInterface* mem_intr)
{
    // mem_intr by default points to dram in case
    // of HeteroMemCtrl, therefore, calling nonDetermReads
    // from MemCtrl using hbm interace
    MemCtrl::nonDetermReads(hbm);
}

/**
 * 
*/
bool
HeteroMemCtrl::hbmWriteBlock(MemInterface* mem_intr)
{
    // mem_intr by default points to dram in case
    // of HeteroMemCtrl, therefore, calling hbmWriteBlock
    // from MemCtrl using hbm interface
    return MemCtrl::hbmWriteBlock(hbm);
}


Tick
HeteroMemCtrl::minReadToWriteDataGap()
{
    return std::min(dram->minReadToWriteDataGap(),
                    hbm->minReadToWriteDataGap());
}

Tick
HeteroMemCtrl::minWriteToReadDataGap()
{
    return std::min(dram->minWriteToReadDataGap(),
                    hbm->minWriteToReadDataGap());
}

/**
 * burstAlign:用于将地址addr对齐到内存接口的突发访问边界
*/
Addr
HeteroMemCtrl::burstAlign(Addr addr, MemInterface* mem_intr) const
{
    // mem_intr will point to dram interface in HeteroMemCtrl
    // 检查地址addr是否在DRAM接口的地址范围内。
    // 如果地址在DRAM接口的地址范围内，则将地址与内存接口的突发访问边界进行按位与操作，
    // 并将结果返回。这样可以 << 将地址对齐到DRAM接口的突发访问边界。>>
    if (mem_intr->getAddrRange().contains(addr)) {
        return (addr & ~(Addr(mem_intr->bytesPerBurst() - 1)));
    } else {
        assert(hbm->getAddrRange().contains(addr));
        return (addr & ~(Addr(hbm->bytesPerBurst() - 1)));
    }
}

/**
 * 用于检查内存包（MemPacket）的大小是否符合内存接口的突发访问大小限制
*/
bool
HeteroMemCtrl::pktSizeCheck(MemPacket* mem_pkt, MemInterface* mem_intr) const
{
    // 内存包的大小是否小于等于DRAM或者接口的突发访问大小
    if (mem_pkt->isDram()) {
        return (mem_pkt->size <= mem_intr->bytesPerBurst());
    } else {
        return (mem_pkt->size <= hbm->bytesPerBurst());
    }
}

/**
 * recvFunctional：用于在功能仿真模式下处理接收到的数据包
*/
void
HeteroMemCtrl::recvFunctional(PacketPtr pkt)
{
    bool found;
    // 定义一个布尔变量found，用于标记是否在内存接口中找到了可以处理该数据包的地址范围。
    found = MemCtrl::recvFunctionalLogic(pkt, dram);
    // 函数尝试在DRAM接口中处理接收到的数据包。如果找到了可以处理该数据包的地址范围，则将found设置为true；否则将found保持为false。
    if (!found) {
        // 再尝试在HBM里找
        found = MemCtrl::recvFunctionalLogic(pkt, hbm);
    }

    if (!found) {
        panic("Can't handle address range for packet %s\n", pkt->print());
    }
}

/**
 * allIntfDrained：用于检查DRAM和HBM接口是否都处于排空状态 ？？
*/
bool
HeteroMemCtrl::allIntfDrained() const
{
    // ensure dram is in power down and refresh IDLE states
    // 检查DRAM接口中的所有存储介质是否都处于排空状态，并将结果存储在dram_drained变量中。
    bool dram_drained = dram->allRanksDrained();
    // No outstanding hbm writes
    // All other queues verified as needed with calling logic
    bool hbm_drained = hbm->allRanksDrained();
    // DRAM接口和HBM接口的排空状态进行逻辑与操作，如果两者都处于排空状态，则返回true，否则返回false
    return (dram_drained && hbm_drained);
}

/**
 * drain： 用于执行内存控制器的排空操作
*/
DrainState
HeteroMemCtrl::drain()
{
    // 检查内存控制器是否已排空。如果有任何内部队列中还有未处理的请求或者DRAM和HBM接口未排空
    if (!(!totalWriteQueueSize && !totalReadQueueSize && respQueue.empty() &&
          allIntfDrained())) {

        DPRINTF(Drain, "Memory controller not drained, write: %d, read: %d,"
                " resp: %d\n", totalWriteQueueSize, totalReadQueueSize,
                respQueue.size());

        // the only queue that is not drained automatically over time
        // is the write queue, thus kick things into action if needed
        // 如果写队列为空且没有下一个请求事件被调度，则立即调度下一个请求事件，以确保写队列中的请求被处理
        if (!totalWriteQueueSize && !nextReqEvent.scheduled()) {
            schedule(nextReqEvent, curTick());
        }

        dram->drainRanks();
        hbm->drainRanks(); // nvm里没有这个

        return DrainState::Draining;
    } else {
        return DrainState::Drained;
    }
}


void
HeteroMemCtrl::drainResume()
{
    if (!isTimingMode && system()->isTimingMode()) {
        // if we switched to timing mode, kick things into action,
        // and behave as if we restored from a checkpoint
        startup();
        dram->startup();
        hbm->startup();
    } else if (isTimingMode && !system()->isTimingMode()) {
        // if we switch from timing mode, stop the refresh events to
        // not cause issues with KVM
        dram->suspend();
        hbm->suspend();
    }

    // update the mode
    isTimingMode = system()->isTimingMode();
}

AddrRangeList
HeteroMemCtrl::getAddrRanges()
{
    AddrRangeList ranges;
    ranges.push_back(dram->getAddrRange());
    ranges.push_back(hbm->getAddrRange());
    return ranges;
}

} // namespace memory
} // namespace gem5

```



## 【ChatGPT】利用已有控制器设置混合内存

```c++
#include "base/types.hh"
#include "mem/HBMCtrl.hh"
#include "mem/MemCtrl.hh"
#include "mem/abstract_mem.hh"

class HybridMemCtrl : public AbstractMemory {
public:
    HybridMemCtrl(HBMCtrl* hbmCtrl, MemCtrl* dramCtrl) 
        : hbmCtrl(hbmCtrl), dramCtrl(dramCtrl) {}

    virtual bool inAddrMap(Addr addr) const override {
        // 假设HBM和DRAM的地址空间不重叠，可以简单地将地址映射到对应的内存控制器
        return hbmCtrl->inAddrMap(addr) || dramCtrl->inAddrMap(addr);
    }

    virtual Tick recvAtomic(PacketPtr pkt) override {
        if (inAddrMap(pkt->getAddr())) {
            if (hbmCtrl->inAddrMap(pkt->getAddr())) {
                return hbmCtrl->recvAtomic(pkt);
            } else {
                return dramCtrl->recvAtomic(pkt);
            }
        } else {
            panic("Address out of range");
        }
    }

    virtual void recvFunctional(PacketPtr pkt) override {
        if (inAddrMap(pkt->getAddr())) {
            if (hbmCtrl->inAddrMap(pkt->getAddr())) {
                hbmCtrl->recvFunctional(pkt);
            } else {
                dramCtrl->recvFunctional(pkt);
            }
        } else {
            panic("Address out of range");
        }
    }

    // 这里还可以根据需要实现其他函数，如recvTiming等

private:
    HBMCtrl* hbmCtrl;
    MemCtrl* dramCtrl;
};

```

```python
# hybrid_mem_ctrl.py
# This file defines the HybridMemCtrl class

from m5.objects import MemCtrl, HBMCtrl, MemInterface

class HybridMemCtrl(MemCtrl):
    type = "HybridMemCtrl"
    cxx_header = "mem/hybrid_mem_ctrl.hh"
    cxx_class = "HybridMemCtrl"

    # Parameters for HBM and DRAM memory interfaces
    hbm = Param.HBMCtrl("HBM memory interface to use")
    dram = Param.MemCtrl("DRAM memory interface to use")

```

```c++
// HybridMemCtrl.hh
#ifndef __HYBRID_MEM_CTRL_HH__
#define __HYBRID_MEM_CTRL_HH__

#include "base/types.hh"
#include "mem/HBMCtrl.hh"
#include "mem/MemCtrl.hh"
#include "mem/abstract_mem.hh"

class HybridMemCtrl : public AbstractMemory {
public:
    HybridMemCtrl(HBMCtrl* hbmCtrl, MemCtrl* dramCtrl);

    virtual bool inAddrMap(Addr addr) const override;

    virtual Tick recvAtomic(PacketPtr pkt) override;

    virtual void recvFunctional(PacketPtr pkt) override;

    // 这里还可以根据需要添加其他函数声明

private:
    HBMCtrl* hbmCtrl;
    MemCtrl* dramCtrl;
};

#endif // __HYBRID_MEM_CTRL_HH__
```

【修改】

python文件

```python
# hybrid_mem_ctrl.py
# This file defines the HybridMemCtrl class

from m5.objects import MemCtrl, HBMCtrl, MemInterface

class HybridMemCtrl(MemCtrl):
    type = "HybridMemCtrl"
    cxx_header = "mem/hybrid_mem_ctrl.hh"
    cxx_class = "HybridMemCtrl"

    # Parameters for HBM and DRAM memory interfaces
    hbmCtrl = Param.HBMCtrl("HBM memory interface to use")
    dramCtrl = Param.MemCtrl("DRAM memory interface to use")
```

hh文件

```c++
#include "base/types.hh"
#include "mem/HBMCtrl.hh"
#include "mem/MemCtrl.hh"
#include "mem/abstract_mem.hh"

class HybridMemCtrl : public AbstractMemory {
public:
    HybridMemCtrl(HBMCtrl* hbmCtrl, MemCtrl* dramCtrl) 
        : hbmCtrl(hbmCtrl), dramCtrl(dramCtrl) {}

    virtual bool inAddrMap(Addr addr) const override {
        // 假设HBM和DRAM的地址空间不重叠，可以简单地将地址映射到对应的内存控制器
        return hbmCtrl->inAddrMap(addr) || dramCtrl->inAddrMap(addr);
    }

    virtual Tick recvAtomic(PacketPtr pkt) override {
        if (inAddrMap(pkt->getAddr())) {
            if (hbmCtrl->inAddrMap(pkt->getAddr())) {
                return hbmCtrl->recvAtomic(pkt);
            } else {
                return dramCtrl->recvAtomic(pkt);
            }
        } else {
            panic("Address out of range");
        }
    }

    virtual void recvFunctional(PacketPtr pkt) override {
        if (inAddrMap(pkt->getAddr())) {
            if (hbmCtrl->inAddrMap(pkt->getAddr())) {
                hbmCtrl->recvFunctional(pkt);
            } else {
                dramCtrl->recvFunctional(pkt);
            }
        } else {
            panic("Address out of range");
        }
    }

    // 这里还可以根据需要实现其他函数，如recvTiming等

private:
    HBMCtrl* hbmCtrl;
    MemCtrl* dramCtrl;
};
```

