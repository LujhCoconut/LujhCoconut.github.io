# 【ISCA'22】Sibyl

**Title:** Sibyl: Adaptive and Extensible Data Placement in Hybrid Storage Systems Using Online Reinforcement Learning

**Keywords:** solid-state drives (SSDs), reinforcement learning, hybrid storage systems, data placement, hybrid systems, machine learning

**Major Contribution:**





## 本文简介

混合存储系统（HSS）使用多种不同的存储设备提供高性能高可扩展的存储容量。跨不同设备的数据放置对于最大化这种混合系统的好处至关重要。最近的研究提出了各种技术，旨在准确识别性能关键数据，并将其放置在一个“最适合”的存储设备中。不幸的是，这些技术大多是rigid，(1)限制了它们适合广泛的工作负载和存储设备配置，(2)使得设计者难以将这些技术扩展到不同的存储系统配置（例如，不同数量的存储设备或不同类型的存储设备）。Sibyl的目标是设计一个新的数据放置技术混合存储系统，克服这些问题和提供： (1)适应性，不断学习和适应工作负载和存储设备特性，和(2)容易扩展广泛的工作负载和HSS配置

Sibyl，是第一个在混合存储系统中使用强化学习放置数据的技术。Sibyl观察了正在运行的工作负载和存储设备的不同特性，以做出具有系统感知能力的数据放置决策。对于它做出的每一个决定，Sibyl都会从系统中获得奖励，它使用该系统来评估其决策的长期性能影响，并不断优化其在线数据放置策略。



## 相关简介

### 强化学习

强化学习（Reinforcement Learning, RL），又称再励学习、评价学习或增强学习，是机器学习的范式和方法论之一，用于描述和解决智能体（agent）在与环境的交互过程中通过学习策略以达成回报最大化或实现特定目标的问题。强化学习是一种学习如何从状态映射到行为以使得获取的奖励最大的学习机制。这样的一个agent需要不断地在环境中进行实验，通过环境给予的反馈（奖励）来不断优化状态-行为的对应关系。因此，反复实验(trial and error）和延迟奖励（delayed reward）是强化学习最重要的两个特征。

强化学习的特点总结为以下四点：

* 没有监督者，只有一个奖励信号

- 反馈是延迟的而非即时
- 具有时间序列性质
- 智能体的行为会影响后续的数据

强化学习系统一般包括**四个要素**：策略（policy），奖励（reward），价值（value）以及环境或者说是模型（model）

**策略**定义了智能体对于给定状态所做出的行为，换句话说，就是一个从状态到行为的映射，事实上状态包括了环境状态和智能体状态，这里我们是从智能体出发的，也就是指智能体所感知到的状态。因此我们可以知道策略是强化学习系统的核心，因为我们完全可以通过策略来确定每个状态下的行为。我们将策略的特点总结为以下三点：

* 策略定义智能体的行为
* 它是从状态到行为的映射
* 策略本身可以是具体的映射也可以是随机的分布

**奖励信号**定义了强化学习问题的目标，在每个时间步骤内，环境向强化学习发出的标量值即为奖励，它能定义智能体表现好坏，类似人类感受到快乐或是痛苦。因此我们可以体会到**奖励信号是影响策略的主要因素**。我们将奖励的特点总结为以下三点：

* 奖励是一个标量的反馈信号
* 它能表征在某一步智能体的表现如何
* 智能体的任务就是使得一个时段内积累的总奖励值最大


**价值**，或者说**价值函数**，这是强化学习中非常重要的概念，**与奖励的即时性不同，价值函数是对长期收益的衡量**。我们常常会说“既要脚踏实地，也要仰望星空”，对价值函数的评估就是“仰望星空”，**从一个长期的角度来评判当前行为的收益，而不仅仅盯着眼前的奖励**。结合强化学习的目的，我们能很明确地体会到价值函数的重要性，事实上在很长的一段时间内，强化学习的研究就是集中在对价值的估计。我们将价值函数的特点总结为以下三点：

* 价值函数是对未来奖励的预测
* 它可以评估状态的好坏
* 价值函数的计算需要对状态之间的转移进行分析

**外界环境，也就是模型（Model）**，它是对环境的模拟，举个例子来理解，**当给出了状态与行为后，有了模型我们就可以预测接下来的状态和对应的奖励**。但我们要注意的一点是并非所有的强化学习系统都需要有一个模型，因此会有基于模型（Model-based）、不基于模型（Model-free）两种不同的方法，不基于模型的方法主要是通过对策略和价值函数分析进行学习。我们将模型的特点总结为以下两点：

* 模型可以预测环境下一步的表现
* 表现具体可由预测的状态和奖励来反映
  

### RNN(Recurrent Neural Network)

RNN用于处理序列数据。在传统的神经网络模型中，是从输入层到隐含层再到输出层，层与层之间是全连接的，每层之间的节点是无连接的。但是这种普通的神经网络对于很多问题却无能无力。例如，你要预测句子的下一个单词是什么，一般需要用到前面的单词，因为一个句子中前后单词并不是独立的。RNN之所以称为循环神经网路，即一个序列当前的输出与前面的输出也有关。具体的表现形式为网络会对前面的信息进行记忆并应用于当前输出的计算中，即隐藏层之间的节点不再无连接而是有连接的，并且隐藏层的输入不仅包括输入层的输出还包括上一时刻隐藏层的输出。理论上，RNN能够对任何长度的序列数据进行处理。但是在实践中，为了降低复杂性往往假设当前的状态只与前面的几个状态相关。

* **RNN重要特点：每一步的参数共享**

### Value function approximation

价值函数的近似法

强化学习中的表格解方法（Tabular Solution methods）可以得到确切的解，但是这些算法只能求解规模比较小的问题。在实际应用中，对于大规模问题，状态和动作空间都比较大的情况下，精确获得各种价值函数v(S)和q(s,a)几乎是不可能的。这时候需要找到近似的函数，具体可以使用线性组合、神经网络以及其他方法来近似价值函数。本讲的新颖性在于近似函数不是表示成表格，而是表示成带有权重向量w的参数化函数形式，





## 一些问题与回答

* We quantify a workload’s randomness using the average request size in the workload; the higher (lower) the average request size, the more sequential (random) the workload.

  >  在计算机体系结构中 为什么可以用工作负载中的平均请求大小来量化工作负载的随机性（或者顺序性）？

  * 当工作负载中的请求大小较大时，**通常表明单个请求涉及的数据量较多**。这意味着系统更有可能连续地访问存储器中的数据块，而不是跳跃式地访问。因此，更大的平均请求大小反映了数据访问模式的连续性，即系统更倾向于按照顺序或者近邻地访问内存中的数据。

  * > 当工作负载中的请求大小较大时，意味着单个请求需要传输的数据量较多。假设一个请求的数据大小为1 MB，而另一个请求的数据大小为100 KB。那么前者的请求大小较大，而后者的请求大小较小。
    >
    > 对于较大的请求大小，系统更有可能连续地访问存储器中的数据块，而不是跳跃式地访问。这是因为大型请求通常会涉及大块连续的数据。让我们来看一下两种情况的不同：
    >
    > 1. **较大请求的连续访问**：假设有一个1 MB 的请求，它需要从存储器中读取数据。系统会连续地读取1 MB 的数据块，然后将这些数据传输给应用程序进行处理。由于数据是连续存储的，系统可以通过一次大规模的数据传输来满足请求，而不需要频繁地在存储介质上进行位置的跳跃。
    > 2. **较小请求的跳跃式访问**：相比之下，如果有一个100 KB 的请求，它需要的数据分散在存储器的不同位置。系统可能需要进行多次小规模的数据传输，以满足这个请求。由于数据是分散存储的，系统需要在存储介质上进行多次位置的跳跃，以获取请求所需的所有数据。

  * 相反，当工作负载中的请求大小较小时，系统更有可能随机地访问存储器中的数据，即请求的数据范围可能更为分散，而不是连续的。这种随机的数据访问模式可能会导致缓存不命中率增加，存储器预取效果下降，并可能增加内存访问延迟。

  > 连续的数据访问模式
  >
  > **缓存命中率提高**：连续的数据访问模式意味着更多的数据可能被缓存在较小的高速缓存中，从而提高了缓存命中率，减少了对主存的访问延迟。
  >
  > **存储器预取**：连续的数据访问模式使得存储器预取更为有效。系统可以在实际需要数据之前预先将连续的数据块加载到缓存中，从而减少了等待数据的延迟。



* Average Request Latency 为什么能反应性能？
  * 在工作负载跟踪中，每个存储请求都标记一个时间戳，指示从处理器核心发出请求的时间。因此，两个连续I/O请求之间的时间间隔表示核心花费于计算的时间



* 请求延迟为什么能够间接反应计算机一些包含排队延迟、缓冲区依赖、垃圾回收有效性、写缓冲区状态、错误处理延迟在内的内部状态？
  * **排队延迟**：当系统中有多个任务需要处理时，它们可能会进入一个队列以等待处理。这种排队过程会引入一定的延迟，特别是当系统负载较高时。
  * **缓冲区依赖**：在数据传输过程中，如果发送端和接收端之间存在缓冲区，数据需要先进入缓冲区，然后再被处理。这会引入传输延迟，特别是当缓冲区已满或者空间不足时。
  * **垃圾回收有效性**：在运行时，一些编程语言或者软件框架可能会进行垃圾回收以释放不再使用的内存资源。垃圾回收的效率会影响系统的性能和延迟，因为它可能会在关键时刻暂停程序的执行来进行垃圾回收操作。
  * **写缓冲区状态**：当数据被写入内存或者磁盘时，通常会先存储在写缓冲区中，然后才会被真正写入目标存储设备。写缓冲区的状态（比如满或者空闲）会影响写操作的延迟。
  * **错误处理延迟**：在系统运行过程中，可能会出现各种错误情况，比如硬件故障、软件异常等。处理这些错误的过程会引入额外的延迟，特别是当系统需要进行错误诊断、恢复或者重新尝试时。