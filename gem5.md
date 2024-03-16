# Gem5 中的内存系统

gem5 中的数据传输，都是靠 Packet 类来完成。因此不论是 send 还是 recv 函数，都需要传递 Packet 类指针：PacketPtr。

当主模块需要下游传来数据时，会通过 RequestPort 调用 `sendTimingReq(pkt)` 发送请求， pkt 是 Packet 的指针，内含有请求数据、应执行的指令、状态等。然而实际上 `sendTimingReq(pkt)` 的实现就是调用 `peer->recvTimingReq(pkt)` 并返回该函数的返回值：

于是，PacketPtr 通过函数参数的方式传给了 RespondPort，而 RespondPort 事实上是处于从模块中，所以现在数据就移动到了下游从模块。注意，`recvTimingReq()` 的返回值给最终会 return 到 `sendTimingReq` 函数中。因此主模块可以知晓请求是否被从模块接收，true 表示该数据包已被收到。false 意味着从模块目前无法接收请求，必须在未来的某个时刻重试。

若 RespondPort 成功接收了 PacketPtr，此时主模块会继续自己的运行，从模块则会处理 Packet，双方都不会被阻塞。当从模块完成处理后，需向主模块发送响应：调用 `sendTimingResp(pkt)`（此时 pkt 是与请求相同的指针，但它现在指向一个响应包）。类似的是，`sendTimingResp(pkt)` 内部实现还是直接调用 `peer->recvTimingResp(pkt)` 并返回该函数的返回值。若 master 的 `recvTimingResp()` 函数返回 true，表明 master 已经收到应答，如此一来，该请求的交互就完成了





* 【Github issue】由于128 GB/s是理论带宽，许多延迟周期被浪费在写入上，我假设了一个访问连续物理寄存器的内存跟踪，并将HBM文件修改为只有1个通道。通过这种方式，我获得了15.71的带宽，如果乘以HBM堆栈应该具有的8个通道，我将获得128 GB/s的峰值。

