# Zico （USENIX ATC'21）

**[Quick Read] 借助AI工具泛读笔记** （by `txyz.ai`）

[Title] **Zico: Efficient GPU Memory Sharing for Concurrent DNN Training**

[Author] Gangmuk Lim, Jeongseob Ahn, Wencong Xiao,  Youngjin Kwon, Myeongjae Jeon

【以后再看，乍看一下没太看懂】

本文介绍了一种新颖的 DNN 系统 Zico，旨在减少并发 DNN 训练期间的全系统内存消耗。解决的主要问题是同地训练作业带来的内存占用量迅速增加，从而限制了 GPU 资源共享的有效性。Zico 监控单个训练作业的内存使用模式，并使回收的内存可全局共享，自动决定并发作业之间的内存共享策略。通过协调作业执行以运行不同的传递并有效地管理内存分配，Zico 的性能优于现有的 GPU 共享方法，可在各种作业托管场景中提供优势。本文的要点和论点包括：

- GPU 对于 DNN 训练等计算密集型工作负载至关重要，但内存占用限制阻碍了有效的资源共享。
- Zico 旨在通过监控单个作业内存使用模式并实现全局内存共享来减少系统范围的内存消耗。
- 本文讨论了现有 DNN 框架在处理并发训练方面的挑战，并介绍了 Zico 作为实现高效内存共享的解决方案。
- Zico 集成了一个新颖的 scrooge 调度器来预测内存消耗趋势并有效地为 DNN 内核分配内存。
- 实验评估表明，Zico 优于传统的空间和时间共享方法，在高内存占用场景中实现了高达 8.3 倍的加速。
- Zico 的设计允许在一系列内存消耗趋势中有效共享内存，证明了它在相同和不同模型上并发训练的有效性。