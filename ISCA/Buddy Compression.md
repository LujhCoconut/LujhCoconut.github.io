# [ISCA'20] Buddy Compression

**Title:** Buddy Compression: Enabling Larger Memory for Deep Learning and HPC Workloads on GPUs

**Keywords:** 

**Major Contribution:**

* 





------

## 本文简介

GPU加速了高吞吐量的应用程序，这需要比传统的仅CPU系统更高数量级的内存带宽。然而，这种高带宽存储器的容量往往相对较小。伙伴压缩是一种架构，它利用了主机更大的伙伴内存或分解内存，有效地增加了GPU的内存容量。伙伴压缩将每个压缩的128B内存条目分为高带宽GPU内存和较慢但较大的伙伴内存之间，这样可压缩内存条目完全从GPU内存访问，而不可压缩条目从非GPU内存中获取部分数据。使用“伙伴压缩”，可压缩性的变化不会导致昂贵的页面移动或重新分配。对于代表性的HPC应用，伙伴压缩平均实现1.9×的有效GPU内存扩展，对于深度学习训练，平均实现1.5×，执行在没有内存限制的不现实的系统的2%以内。这使得Buddy压缩对需要额外GPU内存容量的性能意识开发人员具有吸引力

