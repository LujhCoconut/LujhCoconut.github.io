linux-6.3/mm/

# memory-tiers.c

这段代码是Linux内核中关于内存分层（Memory Tiering）机制的实现。内存分层是一种优化内存访问性能的技术，通过将内存划分为不同的层级（如DRAM、PMEM等），并根据访问延迟或带宽等特性进行管理，从而优化系统的内存使用效率。



- **内存分层结构**：代码定义了`memory_tier`结构体，用于表示一个内存层级。每个层级包含一个抽象距离（`adistance_start`），用于表示该层级的访问延迟或带宽特性。

```c
struct memory_tier {
	/* hierarchy of memory tiers */
	struct list_head list;
	/* list of all memory types part of this tier */
	struct list_head memory_types;
	/*
	 * start value of abstract distance. memory tier maps
	 * an abstract distance  range,
	 * adistance_start .. adistance_start + MEMTIER_CHUNK_SIZE
	 */
	int adistance_start;
	struct device dev;
	/* All the nodes that are part of all the lower memory tiers. */
	nodemask_t lower_tier_mask;
};
```

- **`struct memory_tier`**：表示一个内存层级，包含以下字段：
  - `list`：用于将内存层级链接到全局链表`memory_tiers`中。
  - `memory_types`：该层级中包含的所有内存设备类型的链表。
  - `adistance_start`：该层级的抽象距离起始值。
  - `dev`：与该层级关联的设备结构体。
  - `lower_tier_mask`：表示所有低于该层级的内存节点的掩码。



- **内存设备类型**：`memory_dev_type`结构体表示一种内存设备类型（如DRAM、PMEM等），并包含该类型的内存节点列表。

```c
struct memory_dev_type {
	/* list of memory types that are part of same tier as this type */
	struct list_head tier_sibiling;
	/* abstract distance for this specific memory type */
	int adistance;
	/* Nodes of same abstract distance */
	nodemask_t nodes;
	struct kref kref;
};
```

