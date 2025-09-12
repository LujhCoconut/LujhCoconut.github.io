# Understanding QEMU [L2.02]

本节内容主要包含：QEMU事件循环，书接上回

本节QEMU源代码版本： qemu-10.0.3。涉及到的代码文件如下所示

* `main.c`,`system.h`,`runstate.c`,`main-loop.c`,`vl.c`

> 参考文献：
>
> * 《QEMU/KVM源码解析与应用》
>
> `@last_update`: 2025/09/11



## QEMU事件循环机制

### QEMU自定义事件源AioContext

QEMU自定义了一个新的事件源`AioContext`

* 是 QEMU 自己封装的一个 **事件循环对象**，类似于 `glib` 的 `GMainContext`。

* 每个 `AioContext` 管理一组 **事件源**（Event Sources）：

  * I/O 事件（文件描述符可读/可写，比如磁盘、网络 fd）
  * 定时器（超时触发事件）
  * Bottom-half（BH，延迟执行的轻量任务）

* > 换句话说，`AioContext` 就是 **一个小型的事件调度器**，专门服务于 I/O 线程。

> 注意： 
>
> * `AioContext` 不是一个单独的事件**，它是 **一个事件循环 (event loop) 的上下文环境**。
>
> * 它里面维护了一堆 **事件源**（比如 fd、定时器、回调函数、协程、Block 层的 I/O 请求）。
> * 当 QEMU 主循环或者 AioContext 自己的 `aio_poll()` 被调用时，它会：
>   * 把自己管理的 **fd** 放到 `poll`/`ppoll`/`epoll` 的数组里；
>   * 计算一个超时时间（保证定时器不会错过触发）；
>   * 调用 `poll()` 等待事件；
>   * 返回后，检查哪些事件就绪，然后分发给对应的处理函数。



从代码层面看，**只有一种 AioContext 类型**（就是 `struct AioContext`，定义在 `include/block/aio.h`）但在 QEMU 架构里，它被不同子系统用在两种“角色”：

* **全局事件分发**（监听各种事件，类似 `iohandler_ctx`）
* **块设备异步 I/O**（block layer async I/O，独立 I/O 线程）



两种用法的区别

* 第一类：全局/默认事件循环
  * **iohandler_ctx** 就是一个全局唯一的 `AioContext`
  * 主要负责监听 **杂项事件源** （misc）：
    * QEMU 的 socket（VNC、QMP 等管理接口）
    * 虚拟机设备 fd（例如 TAP 网卡）
    * 定时器
  * 通常运行在 **主线程** 或者 I/O 线程里
  * 相当于“通用事件循环”

> 可以把它理解成 **QEMU 版的 GMainContext**，啥事件都往里挂。

* 第二类：块设备异步 I/O
  * QEMU 的 **Block Layer** 引入了自己的 `AioContext`，用于磁盘 I/O。
  * 每个 **BlockDriverState (BDS)** 都绑定一个 `AioContext`，决定它的 I/O 在哪个事件循环里跑。
  * 典型用途：
    * Virtio-blk / IDE / SCSI 等虚拟磁盘设备的异步读写
    * I/O thread 模型（把磁盘 I/O 从主线程搬到独立线程，提高并发）
  * 如果用户启用了 `-object iothread,id=iothread0`，这个 iothread 背后就是一个独立的 `AioContext`。

> 可以把它理解成 **专用的 I/O 调度器**，只管块设备。



QEMU AioContext时序图

![](.\qemu_004_f1.png)



下面是`AioContext`的代码，位于`include/block/aio.h`

```c++
struct AioContext {
    GSource source;
    QemuRecMutex lock;
    
    BdrvGraphRWlock *bdrv_graph;

    AioHandlerList aio_handlers;
    AioHandlerList deleted_aio_handlers;

    uint32_t notify_me;

    QemuLockCnt list_lock;

    BHList bh_list;

    QSIMPLEQ_HEAD(, BHListSlice) bh_slice_list;

    bool notified;
    EventNotifier notifier;

    QSLIST_HEAD(, Coroutine) scheduled_coroutines;
    QEMUBH *co_schedule_bh;

    int thread_pool_min;
    int thread_pool_max;

    struct ThreadPoolAio *thread_pool;

#ifdef CONFIG_LINUX_AIO
    struct LinuxAioState *linux_aio;
#endif
#ifdef CONFIG_LINUX_IO_URING
    LuringState *linux_io_uring;

    struct io_uring fdmon_io_uring;
    AioHandlerSList submit_list;
#endif

    QEMUTimerListGroup tlg;

    int poll_disable_cnt;

    /* Polling mode parameters */
    int64_t poll_max_ns;    /* maximum polling time in nanoseconds */
    int64_t poll_grow;      /* polling time growth factor */
    int64_t poll_shrink;    /* polling time shrink factor */

    /* AIO engine parameters */
    int64_t aio_max_batch;  /* maximum number of requests in a batch */

    AioHandlerList poll_aio_handlers;

    bool poll_started;

    int epollfd;

    const FDMonOps *fdmon_ops;
};
```

简单介绍一下AioContext中的几个成员

* source
  * QEMU 把 AioContext 封装成一个 GLib 的 `GSource`，这样它就能被挂到 GLib 的主循环里（例如 `g_main_context`）。
  * 当有 I/O 事件（fd 就绪）或者定时器超时，GLib 主循环会调用这个 `GSource` 的回调函数。
  * 这使得 **AioContext 可以和 QEMU 的主事件循环统一调度**。
* lock
  * QEMU的递归互斥锁。
    - 允许同一线程多次获取锁（比如一个回调函数里再次调用需要加锁的 AioContext API）。
  * 用于保护 AioContext 内部的数据结构（例如 `aio_handlers`、`bh_list`）。
  * 保证在多线程环境下（例如一个磁盘 I/O worker 线程 和 主线程同时访问同一个 AioContext）不会出现并发问题。
* aio_handlers
  * 已注册的 **I/O 事件处理器列表**，一个链表头，其链表中的数据类型为AioHandler。
  * 每个 AioHandler 对应一个 **fd 和事件回调**（比如 "socket 可读" / "磁盘完成"）。
  * 主循环会在 `poll()` 返回后，遍历这个列表，找到哪些 fd 就绪，然后调用对应的回调。
* tlg
  * QEMU 的 **定时器集合**。
    * 管理这个 AioContext 里注册的所有定时器。
    * `main_loop_wait()` 会查询最近一个定时器的到期时间，并把它作为 `poll()` 的 timeout。
    * 定时器到期时，触发对应的回调（例如周期性任务、虚拟时钟 tick）。
  * **特点**：
    * 每个 `AioContext` 都有自己的 `tlg`。
    * 定时器事件和 I/O 事件一样，都依赖 `poll()` 来统一调度。

> 档案回顾：`poll()`
>
> 在操作系统里，很多资源（socket、管道、文件描述符、设备驱动接口等）都通过 **文件描述符 (fd)** 来操作。
>
> * 如果你用 `read(fd, buf, size)` 直接读：
>   * **数据还没到** → 线程会 **阻塞**，啥也干不了。
>   * **数据到了** → 返回数据，程序继续。
> * 但在高并发场景下（例如 QEMU 里要同时监听几十个设备、网络连接、磁盘 I/O），如果你逐个 `read/write`，会造成大量的阻塞和性能浪费。
> * 于是，需要一种 **“同时监听多个 fd，就绪了再处理”** 的机制。
>
> 
>
> `poll` 就是一个 **多路复用 I/O** 的系统调用。它的作用是：
>
> * **阻塞等待** 一组文件描述符上的事件（读就绪、写就绪、错误），直到：
>   * 至少一个 fd 就绪；
>   * 或者超时时间到了。

> 一个典型迭代（poll的完整调用链）

> ```c
> qemu_main_loop() {
>   while (!exit) {
>     main_loop_wait(false);            // 一次迭代
>       -> glib_pollfds_fill(&timeout)  // collect GPollFD, compute timeout (ms -> ns)
>       -> os_host_main_loop_wait(timeout_ns)
>          -> qemu_poll_ns(gpollfds, len, timeout_ns)    // ppoll/g_poll -> 阻塞等待
>          <- 返回 (有事件 或 超时)
>       -> glib_pollfds_poll()         // 调度 glib GSource 回调（可能会调用 aio_dispatch）
>       -> qemu_clock_run_all_timers() // 运行 QEMU 定时器回调
>   }
> }
> ```
>
> 或者，当使用 AioContext 专用循环（例如 iothread）时：
>
> ```c
> aio_poll(ctx, true) {
>   userspace polling: for poll_aio_handlers call io_poll() ...
>   if (need kernel wait) fdmon_ops->wait(ctx, ready_list, timeout);
>   process ready_list -> call IO handlers / completion callbacks
>   process BH / timers / coroutines
> }
> ```



Talk is chep ! Show me your code !

如果我想写一个访问MMIO/PIO 设备地址的事件我应该怎么做 ？

整个流程可以分 3 步：（1）明确事件类型  （2）往AioContext注册一个事件处理器 （3）主循环里统一调度

具体来说：

* 明确事件类型

  * 访存事件本质上就是 **某个 fd 上的 I/O 活动**。
    * 设备的 mmio 映射区（/dev/mem、/dev/uio）
    * 后端存储 fd（磁盘、文件）
    * 或者虚拟网卡的 TAP fd
  * 从而，这里的的“事件”就对应一个 **fd 就绪（可读/可写）** 的事件。

* 往 `AioContext` 注册一个事件处理器

  * QEMU 提供 `aio_set_fd_handler()` 来注册事件：(后续会具体介绍)

    ```c++
    #include "qemu/osdep.h"
    #include "qemu/main-loop.h"   // AioContext
    #include "qemu/typedefs.h"
    
    // 假设这是你的访存回调函数
    static void my_memory_io_handler(void *opaque)
    {
        int fd = (intptr_t)opaque;
        char buf[64];
        ssize_t ret = read(fd, buf, sizeof(buf));
        if (ret > 0) {
            printf("访存事件触发: 读到了 %zd 字节\n", ret);
        }
    }
    
    void register_my_mem_event(AioContext *ctx, int fd)
    {
        aio_set_fd_handler(ctx, fd,
                           true,                    // 关心可读事件
                           my_memory_io_handler,    // 可读时调用
                           NULL,                    // 可写时调用
                           NULL,                    // poll准备阶段
                           (void *)(intptr_t)fd);   // 传给 handler 的参数
    }
    ```

    这段代码的意思是：

    * 把 `fd` 加到 AioContext 的监听列表；
    * 如果 `fd` 可读，`poll()` 返回后会调用 `my_memory_io_handler`。

* 主循环里统一调度

  * 注册好事件后，不需要你手动写 `poll()`。
  * QEMU 的 **主循环** 或 **AioContext 的 aio_poll()** 会自动：
    * 把 `fd` 塞进 `pollfd[]`
    * 调用 `poll()`
    * 返回后发现 `fd` 就绪 → 调用 `my_memory_io_handler`



### AioContext API

Abstract

`aio_context_new()`**创建一个新的 AioContext**，也就是 QEMU 的“事件处理上下文”。它相当于“创建一个事件管理器”，后续注册 fd 或定时器都依赖这个 ctx。

`aio_set_fd_handler()`在某个 `AioContext` 中 **注册一个文件描述符 (fd) 的回调事件**。它是把一个 **I/O 事件 fd** 注册到 AioContext 管理中，让主循环知道这个 fd 的状态变化时要调用回调。



![](.\qemu_004_f3.png)



#### aio_context_new

这是创建AioContext的函数，返回新创建的 `AioContext` 指针，代码实现位于`util/async.c`，定义于`aio.h`。

仅以fd相关为主，忽略I/O相关

```c
AioContext *aio_context_new(Error **errp)
{
    int ret;
    AioContext *ctx;
	// 使用 GLib 的 g_source_new() 分配一个新的 GSource，大小是 sizeof(AioContext)。
    // aio_source_funcs 定义了 GSource 的回调函数（prepare/poll/check/dispatch）。
    // 返回的 ctx 实际上 兼具 GSource 和 AioContext 的功能。
    ctx = (AioContext *) g_source_new(&aio_source_funcs, sizeof(AioContext));
   
    ......
        
    // 初始化 AioContext 内部状态
    aio_context_setup(ctx);
	// 初始化事件通知器
    // notifier 用于唤醒主循环或阻塞在 aio_poll() 的线程。
    // 如果初始化失败，返回 NULL 并设置错误信息。
    ret = event_notifier_init(&ctx->notifier, false);
    
    ......
	
    // 注册事件通知器回调
    // 将事件通知器与 AioContext 关联。
    // 当 notifier 被触发时，会调用：
    aio_set_event_notifier(ctx, &ctx->notifier,
                           aio_context_notifier_cb, // （回调）
                           aio_context_notifier_poll, // （轮询阶段）
                           aio_context_notifier_poll_ready); // （轮询就绪阶段）
	......
        
    timerlistgroup_init(&ctx->tlg, aio_timerlist_notify, ctx);

   	......

    return ctx;
}
```

简单来说;这个函数创建了一个`AioContext`结构体`ctx`，然后初始化代表该事件源的事件通知对象`ctx->notifier`，接着调用`aio_set_event_notifier`用来设置`ctx->notifier`对应的事件通知函数，初始化ctx中的其它成员。

#### aio_set_event_notifier

其中`aio_set_event_notifier`函数实现在`util/aio-posix.c`，并调用了`aio_set_fd_handler`函数以添加或删除事件源中的一个fd。

```c++
void aio_set_event_notifier(AioContext *ctx,
                            EventNotifier *notifier,
                            EventNotifierHandler *io_read,
                            AioPollFn *io_poll,
                            EventNotifierHandler *io_poll_ready)
{
    aio_set_fd_handler(ctx, event_notifier_get_fd(notifier),
                       (IOHandler *)io_read, NULL, io_poll,
                       (IOHandler *)io_poll_ready, notifier);
}
```

#### aio_set_fd_handler

`aio_set_fd_handler`函数同样实现在`util/aio-posix.c`

```c++
void aio_set_fd_handler(AioContext *ctx,
                        int fd,
                        IOHandler *io_read,
                        IOHandler *io_write,
                        AioPollFn *io_poll,
                        IOHandler *io_poll_ready,
                        void *opaque)
{
    AioHandler *node;
    AioHandler *new_node = NULL;
    bool is_new = false;
    bool deleted = false;
    int poll_disable_change;
	// 确认轮询回调有效性
    // 轮询回调 io_poll 必须配合 io_poll_ready 使用，否则无意义，将其置为 NULL。
    if (io_poll && !io_poll_ready) {
        io_poll = NULL; /* polling only makes sense if there is a handler */
    }
	// 加锁保护: 保护 aio_handlers 列表和 fd 注册/删除过程的线程安全。
    qemu_lockcnt_lock(&ctx->list_lock);
	// 见下面注释
    node = find_aio_handler(ctx, fd);

    /* Are we deleting the fd handler? */
    if (!io_read && !io_write && !io_poll) {
        if (node == NULL) {
            qemu_lockcnt_unlock(&ctx->list_lock);
            return;
        }
        /* Clean events in order to unregister fd from the ctx epoll. */
        node->pfd.events = 0;

        poll_disable_change = -!node->io_poll;
    } else {
        poll_disable_change = !io_poll - (node && !node->io_poll);
        if (node == NULL) {
            is_new = true;
        }
        /* Alloc and insert if it's not already there */
        new_node = g_new0(AioHandler, 1);

        /* Update handler with latest information */
        new_node->io_read = io_read;
        new_node->io_write = io_write;
        new_node->io_poll = io_poll;
        new_node->io_poll_ready = io_poll_ready;
        new_node->opaque = opaque;

        if (is_new) {
            new_node->pfd.fd = fd;
        } else {
            new_node->pfd = node->pfd;
        }
        g_source_add_poll(&ctx->source, &new_node->pfd);

        new_node->pfd.events = (io_read ? G_IO_IN | G_IO_HUP | G_IO_ERR : 0);
        new_node->pfd.events |= (io_write ? G_IO_OUT | G_IO_ERR : 0);

        QLIST_INSERT_HEAD_RCU(&ctx->aio_handlers, new_node, node);
    }

    qatomic_set(&ctx->poll_disable_cnt,
               qatomic_read(&ctx->poll_disable_cnt) + poll_disable_change);

    ctx->fdmon_ops->update(ctx, node, new_node);
    if (node) {
        deleted = aio_remove_fd_handler(ctx, node);
    }
    qemu_lockcnt_unlock(&ctx->list_lock);
    aio_notify(ctx);

    if (deleted) {
        g_free(node);
    }
}
```

**功能概述：**

1. 为指定的 fd 注册读/写/轮询回调。
2. 如果 `io_read/io_write/io_poll` 都为 NULL，则表示删除该 fd 的事件监听。
3. 处理底层 `GSource` 和 `AioHandler` 列表的更新。
4. 根据需要触发 `aio_notify()`，唤醒正在阻塞等待事件的线程。



`aio_set_fd_handler`的第一个参数`ctx`表示需要添加`fd`到哪个AioContext事件源；第二个参数fd表示添加的fd是需要在主循环中进行监听的；`is_externel`用于块设备层，对于事件监听的fd都设置为false；io_read和io_write都是对应fd的回调函数，opaque会作为参数调用这些回调函数。

![](.\qemu_004_f2.png)

>图为aio_handlers链表



* `aio_set_fd_handler`函数会首先调用`find_aio_handler`查找当前事件源`ctx`中是否已经有了`fd`。

  * ```c++
    node = find_aio_handler(ctx, fd);
    ```

    * 在 `ctx->aio_handlers` 列表中查找是否已有这个 fd 的注册记录。

    * `node` 如果为 NULL，则表示这是新 fd，需要分配新的节点。

    * ```c++
      // # 伪代码
      AioHandler *find_aio_handler(AioContext *ctx, int fd) {
          AioHandler *node;
          QLIST_FOREACH(node, &ctx->aio_handlers, node) {
              if (node->pfd.fd == fd) {
                  return node; // 找到已有节点
              }
          }
          return NULL; // 没找到，说明是新 fd
      }
      ```

      * `QLIST_FOREACH` 是 QEMU 提供的链表迭代宏。
      * 如果找到了对应 fd 的节点，就返回这个节点 `node`。
      * 如果没找到，返回 NULL → 说明这是一个 **新注册的 fd**，需要分配新的 `AioHandler`。

      > 为什么要查找已有节点?
      >
      > * **更新回调**：如果 fd 已经存在，只需要更新它的 `io_read/io_write/io_poll`。
      > * **避免重复注册**：同一个 fd 多次注册会出错，需要判断是更新还是新增。
      > * **删除 fd**：如果传入的所有回调都是 NULL，就说明要删除该 fd，这时必须先找到已有节点。