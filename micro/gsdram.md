# GS-DRAM (MICRO'15)

**Title:** Gather-Scatter DRAM: In-DRAM Address Translation to Improve the Spatial Locality of Non-unit Strided Accesses

**Keywords:** Strided accesses, DRAM, Memory bandwidth, In-memory databases, SIMD, Performance, Energy, Caches

**Major Contribution:**







## DRAM传输数据详解

### 层次结构

* DRAM-based主存系统是一个多级层次结构。在最高层，每一个处理器拥有一个或多个DRAM channels。

* 每一个DRAM Channel由一个专用的控制总线、地址总线和数据总线。

* 一个或多个内存模块可以连接到一个DRAM Channel上。

* 每一个内存模块可以包含多个DRAM芯片。

* 由于每个DRAM芯片的数据输出带宽较小（典型的DRAM是8bits），多个DRAM芯片组成一个rank

* rank里的所有DRAM芯片共享控制总线和地址总线，但每个DRAM芯片有自己的数据总线
  * 从而到rank的命令会被多个DRAM芯片处理从而提升数据带宽
  * 例如一个rank如果包含8个DRAM芯片，那么就拥有64bits的数据带宽

* 每一个DRAM芯片拥有多个DRAM bank（其实还能往下抽象）
* 每一个bank有多个DRAM Row组成，此外还有一个Row Buffer用于缓存bank上一次访问的行
* 每一个DRAM Row包含多个cache line，每一个cache line可以被列地址标记



### 传输数据

假设现在有一个4-chip Rank的DRAM，cache line size为32B.

此时内存控制器收到一个32Bcacheline粒度的访问，内存控制器

* 首先决定是这个cache line位于内存层次结构的哪个Bank B，行地址 R，和列地址C
  * 由于每一个cache line的数据会被平等的分布在rank的四个chip，内存控制器需要保持一种映射关系决定cache line的哪些部分需要映射到哪个chip。最简单的就是每8Bytes映射一个chip。

假设此时需要从DRAM里读Cache line

* 首先，控制器提出`PRECHARGE`命令到bank B ， 以为新的访问准备好一个bank

  * 已经是`PRECHARGE`可以跳过

* 然后，控制器提出`ACTIVATE`命令到bank以激活行地址R

  * 该命令指示rank中的所有芯片将数据从相应行的 DRAM 单元复制到row buffer中。

  * 当然如果R已经被激活，这部也可以跳过。

* 最后，内存控制器向bank发出携带列地址C的`READ`命令以访问cache line

  * 当收到命令时，每个chip从row buffer访问数据相应的列并传到数据总线上
  * 注意 数据8B 数据总线宽度8bits DDR半个总线周期可以传一次数据  因此8B数据需要4个周期传完
  * 数据传输完成后，内存控制器会根据cache-line-to-chip mapping scheme 所需的cacheline，并将cacheline发送回处理器

写操作是类似的



## The Gather-Scatter DRAM

This paper's idea是让控制器只需发出一条命令，就能从一个rank内的不同芯片中访问跨步式访问的多个值。

但这有两个挑战：

* 表中所有元组的第一个长条都映射到同一个芯片上。内存控制器必须为每个值发出一次 READ，而元组的第一个长条应分布在所有芯片上，以便控制器以最少的 READ 次数收集它们。