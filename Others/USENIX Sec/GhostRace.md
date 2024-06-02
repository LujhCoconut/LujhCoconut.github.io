# GhostRace [USENIX Security'24]

**[Title]** GhostRace: Exploiting and Mitigating Speculative Race Conditions

[By the way] 顺便回顾一下操作系统的并发控制

[other ref] https://jyywiki.cn/OS/2024/

## Abstract

​	当多个线程试图在没有适当同步的情况下访问共享资源时，就会出现竞争条件，经常导致concurrent use-after-free等漏洞。为了减少它们的发生，操作系统依赖于同步原语，如互调器、自旋锁等。

![](.\use-after-free.png)

​	在本文中，我们介绍了 GhostRace，这是对推测执行代码路径上的这些同步原语进行的首次安全分析。我们的主要发现是，所有常见的同步原语都可以在投机路径上被微体系结构绕过，从而将所有体系结构上race-free的临界区域变成投机race conditions（SRC）。为了研究SRC的严重性，本文重点研究了SCUAF（Speculative Concurrent Use-After-Free），并在Linux内核中发现了1,283个可能被利用的gadgets。此外，本文还证明了针对内核的 SCUAF 针对内核的信息泄露攻击不仅实用，而且其可靠性可与传统的 Spectre （幽灵）攻击相媲美，我们的概念验证以 12 KB/s 的速度泄露内核内存。最重要的是，本文开发了一种创建无限制race-window的新技术，可在单个race window中容纳端到端攻击所需的任意数量的 SCUAF 调用。为了应对新的攻击面，我们还提出了一种通用的 SRC 缓解方法，以强化 Linux 上所有受影响的同步原语。



## Concurrency Review

​	为了应对并发程序在临界资源可能导致的并发bug，有许多的并发控制手段被采用，比如同步原语中的互斥锁和自旋锁等等。

> 互斥：Stop the world 消灭并发

### 自旋

```c++
/*Author:jyy 自旋 示意*/
void spin_lock(lock_t *lk) {
retry:
    int got = atomic_xchg(&lk->status, ❌);
    if (got != ✅) {
        goto retry;
    }
}

void spin_unlock(lock_t *lk) {
    atomic_xchg(&lk->status, ✅);
}
```

> lock/unlock 并没有stop the world
>
> * 只是**同一把锁保护的代码被串行化**了

例子：线程T2和T1仍然有数据竞争data race.相当于线程T2忘记上锁。

```
T1: spin_lock(&lk); sum++; spin_unlock(&lk);
T2: sum++;
```

**仅仅自旋就能正确实现互斥？但注意还有中断！**

> 中断可以理解为一根线，CPU接收到这根线的高电平信号，就会进行中断处理（前提是中断打开）

![](.\spin-lock-intr.png)

**操作系统内核中的自旋锁不仅要实现处理器间的互斥，还要正确处理中断，以及锁的嵌套。当多个需求叠加时，作出一个正确的实现就不再显然**

用自旋锁实现 sum++：更多的处理器，更差的性能

使用场景：**操作系统内核的并发数据结构 (短临界区)**  临界区几乎不 “拥堵”，迅速结束



#### 应用程序自旋的后果

性能问题 (1)

- 除了进入临界区的线程，其他处理器上的线程都在空转
  - 争抢锁的处理器越多，利用率越低
  - 如果临界区较长，不如把处理器让给其他线程

性能问题 (2)

- 应用程序不能关中断……
  - 持有自旋锁的线程被切换
  - 导致 100% 的资源浪费
  - (如果应用程序能 “告诉” 操作系统就好了)



### 互斥锁

#### 应用程序实现互斥

- 把锁的实现放到操作系统里就好啦（利用系统调用）

  - ```c++
    syscall(SYSCALL_lock, &lk);
    ```

    - 试图获得 `lk`，但如果失败，就切换到其他线程

  - ```c++
    syscall(SYSCALL_unlock, &lk);
    ```

    - 释放 `lk`，如果有等待锁的线程就唤醒

**使用互斥锁实现同步**：我们可以让每一个等待同步的线程都首先试图获取一把 “绝对不可能得到” 的锁——它们会等待，然后由后来的同步者释放这把锁。

**使用互斥锁实现计算图**：通过在一个线程获得互斥锁，在另一个线程释放，我们能实现 “计算图” 的计算。在这里，每条边上的互斥锁充当了一单位的 “许可”，release 和 acquire 形成了代表同步的 **happens-before** 关系。



### 同步

**同步**：在某个时刻，线程 (状态机中的多个执行流) 达成某种一致的状态，进而从而从等待到继续，即为同步。（有点先来先等待的意思）

#### 条件变量

- 把条件用一个变量来替代
- 条件不满足时等待，条件满足时唤醒

```c++
mutex_lock(&lk);
if (!condition) {
    cond_wait(&cv, &lk);
}
// Wait for someone for wake-up.
assert(condition);
mutex_unlock(&lk);
```

```c++
cond_signal(&cv);  // Wake up a (random) thread
cond_broadcast(&cv);  // Wake up all threads
```

**条件变量的正确打开方式**

- 使用 while 循环和 broadcast
  - 总是在唤醒后再次检查同步条件
  - 总是唤醒所有潜在可能被唤醒的人

```c++
mutex_lock(&mutex);
while (!COND) {
  wait(&cv, &mutex);
}
assert(cond);

...

mutex_unlock(&mutex);
```

> **生产者-消费者问题**：在解决同步问题时，关键在于理解 “同步成功” 的条件是什么。然后各个线程在条件不满足时等待，直到条件满足方可继续。这个思路自然地引出了 “条件变量” 这一同步机制。



**并发控制的机制完全是 “后果自负” 的**

- 互斥锁 (lock/unlock) 实现原子性
  - 忘记上锁——原子性违反 (Atomicity Violation, AV)
- 条件变量/信号量 (wait/signal) 实现先后顺序同步
  - 忘记同步——顺序违反 (Order Violation, OV)



​	实际上，“原子性” 一直是并发控制的终极目标。对编程者而言，理想情况是一段代码的执行要么看起来在瞬间全部完成，要么好像完全没有执行过。代码中的副作用：共享内存写入、文件系统写入等，则都是实现原子性的障碍。

​	因为 “原子性” 如此诱人，在计算机硬件/系统层面提供原子性的尝试一直都没有停止过：从数据库事务 (transactions, tx) 到软件和硬件支持的 [Transactional Memory](https://dl.acm.org/doi/10.1145/165123.165164) (“[an idea ahead its time](https://news.brown.edu/articles/2012/04/transaction)”) 到 [Operating System Transactions](https://dl.acm.org/doi/abs/10.1145/1629575.1629591)，直到今天我们依然没有每个程序员都垂手可得的可靠原子性保障。

​	而保证程序的执行顺序就更困难了。Managed runtime 实现自动内存管理、channel 实现线程间通信等，都是减少程序员犯错的手段。