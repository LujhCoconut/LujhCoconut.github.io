# DTL (ISCA'23）

**[Title]** DRAM Translation Layer: Software-Transparent DRAM Power  Savings for Disaggregated Memory



## Abstract





## 相关简介

### Flash Translation Layer

Flash Translation Layer (FTL)是一种软件层，用于管理闪存存储设备中的数据存储和访问。闪存存储器是一种非易失性存储介质，常见于固态硬盘（SSD）和闪存驱动器（USB闪存驱动器、SD卡等）中。FTL的主要功能是将逻辑地址（由文件系统和应用程序使用的地址）转换为物理地址（存储在闪存芯片中的实际存储位置）。

FTL在闪存设备中发挥关键作用，因为闪存具有写入时必须先擦除（erase before write）的特性，这意味着在写入新数据之前，必须先将原有的数据擦除。这种特性导致了闪存存储器的写入延迟和擦除次数的限制。FTL通过一系列复杂的算法和数据结构来优化闪存的使用，以减少写入延迟、最小化擦除操作，并确保数据的均衡分布，从而延长闪存设备的寿命。

FTL通常包括以下主要功能：

1. 页面映射（Page Mapping）：将逻辑页地址映射到物理页地址，以支持数据的读取和写入。
2. 垃圾收集（Garbage Collection）：定期整理闪存中的无效数据页，以释放出可用的空间，并减少写入时的延迟。
3. 写入放大（Write Amplification）控制：通过优化写入过程，减少写入放大效应，提高写入性能和闪存寿命。
4. 均衡算法：确保数据在闪存芯片中的分布均衡，避免部分页的过度使用而导致芯片寿命缩短。

总之，FTL在闪存设备中起着关键作用，通过管理数据存储和访问，提高了闪存设备的性能、可靠性和寿命。



### HPA与DPA的区别

1. **Host Physical Address (主机物理地址)**:
   - 主机物理地址是指计算机系统中主机处理器（CPU）可以直接访问的物理内存地址。这些地址标识着系统内存中的特定位置，可以直接用于CPU读取和写入内存数据。
   - 主机物理地址是由内存管理单元（MMU）负责管理和转换的，MMU将逻辑地址转换为主机物理地址，使得CPU可以在内存中进行直接的读写操作。
2. **DRAM Device Physical Address (DRAM设备物理地址)**:
   - DRAM设备物理地址指的是动态随机存取存储器（DRAM）芯片上的物理地址。DRAM是计算机系统中用于存储数据的主要内存类型。
   - 当计算机系统中存在多个DRAM芯片时，每个芯片都有自己的物理地址范围。DRAM设备物理地址标识了DRAM芯片中的特定存储位置。

**区别**：

- 主机物理地址是指CPU可以直接访问的系统内存地址，而DRAM设备物理地址是指DRAM芯片上的特定存储位置。
- 主机物理地址是由MMU管理和转换的，而DRAM设备物理地址是硬件层面上的地址，用于在DRAM芯片上定位数据。



### Iterator in Clock Algorithm

在 CLOCK 算法中，"hand"（也称为"iterator"）是一个指向钟表（clock）中某个页面的指针或迭代器。CLOCK算法是用于页面置换的一种近似最佳算法，通常用于操作系统中的虚拟内存管理。

算法维护一个环形缓冲区，其中存储了最近访问的页面。"hand"指针用于遍历环形缓冲区，以确定下一个被选中的页面进行替换。具体来说，当需要替换页面时，"hand"指针沿着环形缓冲区移动，检查每个页面的访问位（通常是一个额外的比特，记录最近是否被访问过）。如果一个页面的访问位为0（表示最近未被访问过），那么该页面就被选中进行替换。如果访问位为1，则将其重置为0，并继续移动"hand"指针。

通过使用"hand"指针，CLOCK算法能够快速地找到适合替换的页面，并确保了页面置换的高效性。



### MPSM

最大功率节省模式（Maximum Power Saving Mode, MPSM）是一种技术，旨在通过减少系统的功耗来提高能源效率。在计算机体系结构和数据中心管理中，这种模式通常与动态电源管理和动态频率调整相结合，以降低电源消耗，延长电池寿命，或者减少电力和冷却成本。

在MPSM中，系统通常会做出以下调整来最大限度地节省电力：

1. **时钟门控（Clock Gating）：**
   - 通过关闭不必要的电路时钟，可以降低动态电力消耗。这可以在处理器空闲时或执行不重要任务时进行。
2. **电源门控（Power Gating）：**
   - 关闭不必要的电路电源，可以减少静态电力消耗。这种方式通常用于不活动的组件，如未使用的核心、缓存或外围设备。
3. **动态电压和频率缩放（DVFS）：**
   - 根据工作负载动态调整处理器的电压和频率，以最大限度地节省电力，同时保持性能满足需求。
4. **自动关闭和休眠（Automatic Shutdown and Sleep）：**
   - 在一定时间没有任务执行时，系统可以自动进入休眠状态或关闭，以减少不必要的功耗。
5. **功率监测和管理：**
   - 系统可能配备传感器和监测工具来跟踪电力使用，并通过调整资源分配和任务优先级来最大限度地提高能源效率。

在虚拟化环境中，MPSM可能涉及以下方面：

- **动态资源分配：**
  - 将计算资源动态分配给不同的虚拟机，以便在低负载时期降低功耗。
- **虚拟机迁移：**
  - 在数据中心内移动虚拟机，以便将工作负载集中到少量服务器上，从而关闭空闲的服务器。

MPSM的目标是通过智能管理和调整系统的运行参数，以满足当前工作负载的需求，同时最大限度地降低电力消耗。这种技术在现代计算机体系结构和数据中心管理中扮演着越来越重要的角色



### 分离式内存的内存干扰

分离式内存（Memory Disaggregation）是一种将计算资源和内存资源从单个计算节点中分离出来并集中管理的计算架构。在这种架构中，计算节点（例如CPU或GPU）与共享的远程内存池之间通过高速网络进行通信，以便计算节点可以访问远程内存池中的数据。这种架构的目标是提高资源的利用率和灵活性，同时降低整体成本。

然而，由于计算节点和内存池之间的物理距离，以及不同计算节点同时访问共享内存池的情况，可能会出现以下几种内存干扰问题：

1. **延迟问题：**
   - 在分离式内存架构中，由于计算节点需要通过网络访问远程内存池，可能导致数据访问延迟较高。与传统的直接访问本地内存相比，这种延迟可能影响应用程序的性能。
2. **带宽竞争：**
   - 当多个计算节点同时访问远程内存池时，它们会共享相同的网络带宽。这可能导致带宽竞争，进而导致内存访问速度下降，并对应用程序的性能产生负面影响。
3. **缓存和一致性问题：**
   - 为了提高访问远程内存的效率，计算节点可能会在本地缓存部分数据。这会导致缓存一致性问题，即当不同计算节点访问同一数据时，它们缓存中的数据可能不同步，从而导致数据不正确。
4. **数据争用和冲突：**
   - 当多个计算节点同时访问同一内存区域时，可能出现数据争用和冲突。这可能导致数据不一致或性能下降，因为节点可能需要协调访问权。
5. **流量集中化问题：**
   - 在远程内存池与计算节点之间的网络上，流量可能会集中在某些特定的时间段或区域。这种流量集中化可能导致网络拥塞，并影响整个系统的性能。

为了减少内存干扰问题，分离式内存架构可以采用以下措施：

- **高性能网络：**
  - 使用高性能的网络（如RDMA、InfiniBand）来降低延迟和增加带宽。
- **缓存优化：**
  - 利用缓存策略和一致性协议来减少缓存问题，并提高数据访问效率。
- **流量管理：**
  - 利用网络流量控制和调度策略，确保数据传输的公平性和效率。
- **数据分区和隔离：**
  - 将数据在内存池中进行合理的分区和隔离，减少计算节点之间的竞争和争用。

分离式内存架构仍然是一个相对较新的领域，随着技术的发展和成熟，这些干扰问题可能会得到进一步解决和改进。



## Introduction











➊ If the segment being accessed is in the victim rank, the corresponding entry in the victim rank swaps with the entry pointed by the TSP. Like the CLOCK algorithm, if the access bit is set to 1,

➋ DTL resets its access bit to 0 and then moves TSP to the next entry. 

➌ TSP keeps moving to the next entry until an entry whose access bit is 0 or a timeout occurs. Then it swaps the rank and segment numbers between the victim entry and the target entry. Note that actual segment migration does not happen until the migration phase; it only *simulates* a segment migration plan that potentially maximizes the victim rank idle time.