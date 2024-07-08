# gem5::Process Class Refference



------

## **page_table**

[gem5: mem/page_table.cc Source File](https://doxygen.gem5.org/release/current/page__table_8cc_source.html#l00048)

### **map**

​	**Parameters**

| **vaddr**     | **The starting virtual address of the range.**  |
| ------------- | ----------------------------------------------- |
| **paddr**     | **The starting physical address of the range.** |
| **size**      | **The length of the range in bytes.**           |
| **cacheable** | **Specifies whether accesses are cacheable.**   |

```c++
void
EmulationPageTable::map(Addr vaddr, Addr paddr, int64_t size, uint64_t flags)
{
    // flags如果不为1 则按位与的结果为0 否则为1
    // 因此，这里检查传入的标志是否包含覆盖（clobber）标志。
    bool clobber = flags & Clobber;
    // 确保起始虚拟地址是页面对齐的。如果不对齐，则会触发断言失败。
    assert(pageOffset(vaddr) == 0);
 	// 打印分配页面的日志信息。可在脚本中输入命令  --debug-flags=MMU  获得输出结果
    DPRINTF(MMU, "Allocating Page: %#x-%#x\n", vaddr, vaddr + size);
 	// 循环处理整个范围内的映射，每次处理一页大小的映射。
    while (size > 0) {
        // 查找当前虚拟地址是否已经在页表中存在
        auto it = pTable.find(vaddr);
        // 如果已经存在映射
        if (it != pTable.end()) {
            // 检查是否允许覆盖。如果不允许覆盖，则触发panic。
            panic_if(!clobber,
                     "EmulationPageTable::allocate: addr %#x already mapped",
                     vaddr);
            //  如果允许覆盖，则更新对应的物理地址和标志。
            it->second = Entry(paddr, flags);
        } else {
            // 如果不存在，则在页表中插入新的映射条目
            pTable.emplace(vaddr, Entry(paddr, flags));
        }
 		// 更新剩余大小，虚拟地址和物理地址，继续处理下一页。
        size -= _pageSize;
        vaddr += _pageSize;
        paddr += _pageSize;
    }
}
```



clobber定义在`Line98` in **page_table.hh** 

```c++
    enum MappingFlags : uint32_t
    {
        Clobber     = 1,
        Uncacheable = 4,
        ReadOnly    = 8,
    };
```

`Clobber`（值为1）：表示覆盖已经存在的映射。

`Uncacheable`（值为4）：表示映射的内存区域是不可缓存的。

`ReadOnly`（值为8）：表示映射的内存区域是只读的。



`_pageSize` 为`const Addr` 类型 定义在`Line70` in **page_table.hh** 



### remap

用于重新映射虚拟地址范围，将原来的虚拟地址范围 `vaddr` 移动到新的虚拟地址范围 `new_vaddr`。

```c++
void
EmulationPageTable::remap(Addr vaddr, int64_t size, Addr new_vaddr)
{
    // 确保起始虚拟地址和新的虚拟地址都是页面对齐的
    assert(pageOffset(vaddr) == 0);
    assert(pageOffset(new_vaddr) == 0);
	// 打印调试信息,显示要移动的页范围和大小
    DPRINTF(MMU, "moving pages from vaddr %08p to %08p, size = %d\n", vaddr,
            new_vaddr, size);
 	// 循环处理每一页
    while (size > 0) {
        // 查找新旧地址的迭代器,查找页表中是否存在 vaddr 和 new_vaddr 的映射。
        [[maybe_unused]] auto new_it = pTable.find(new_vaddr);
        auto old_it = pTable.find(vaddr);
        // 断言检查:确保 vaddr 在页表中存在映射，而 new_vaddr 在页表中不存在映射
        assert(old_it != pTable.end() && new_it == pTable.end());
 		// 插入新映射并删除旧映射:将旧地址 vaddr 的映射插入到新地址 new_vaddr 中，并删除旧地址的映射。
        pTable.emplace(new_vaddr, old_it->second);
        pTable.erase(old_it);
        // 更新剩余大小和地址,减去已经处理的页面大小，更新虚拟地址和新虚拟地址，继续处理下一页
        size -= _pageSize;
        vaddr += _pageSize;
        new_vaddr += _pageSize;
    }
}
```



### getMappings

用于获取当前页表中的所有虚拟地址和物理地址的映射，并将这些映射存储在一个 `std::vector` 中

```c++
void
EmulationPageTable::getMappings(std::vector<std::pair<Addr, Addr>> *addr_maps)
{
    // 这行代码使用范围循环遍历 pTable 中的所有元素。pTable是std::unordered_map<Addr,Entry>的容器
    for (auto &iter : pTable)
        // 将映射添加到向量
        addr_maps->push_back(std::make_pair(iter.first, iter.second.paddr));
}
```

`addr_maps` 是一个指向 `std::vector<std::pair<Addr, Addr>>` 的指针，这个向量用于存储从虚拟地址到物理地址的映射对。

`pTable` 是一个 `std::unordered_map<Addr, Entry>`，其中 `Addr` 是虚拟地址，`Entry` 是一个包含映射信息的类。

`iter` 是一个引用，指向 `pTable` 中的当前元素，它是一个键值对（key-value pair）。

`iter.first` 是虚拟地址（键）。

`iter.second` 是一个 `Entry` 对象，包含映射信息。

`iter.second.paddr` 是物理地址。

使用 `std::make_pair` 创建一个包含虚拟地址和物理地址的 `std::pair<Addr, Addr>` 对象，然后将这个对象添加到 `addr_maps` 向量中。



### unmap

用于从页表中取消映射一段虚拟地址范围

```c++
void
EmulationPageTable::unmap(Addr vaddr, int64_t size)
{
    // 确保起始虚拟地址 vaddr 是页面对齐的。如果 vaddr 不是页面对齐的，将触发断言失败（程序终止）。
    assert(pageOffset(vaddr) == 0);
 	// 打印调试信息，显示将要取消映射的页面范围和大小
    DPRINTF(MMU, "Unmapping page: %#x-%#x\n", vaddr, vaddr + size);
 	// 取消映射循环
    while (size > 0) {
        // 查找映射,使用 pTable.find(vaddr) 查找虚拟地址 vaddr 对应的映射
        // 如果找到了映射，返回一个指向该映射的迭代器；否则，返回 pTable.end()
        auto it = pTable.find(vaddr);
        // 确保 vaddr 在页表中存在映射。如果不存在，将触发断言失败（程序终止）
        assert(it != pTable.end());
        // 使用 pTable.erase(it) 从页表中删除找到的映射
        pTable.erase(it);
        // 更新剩余大小和地址,将 size 减去页面大小 _pageSize，更新 vaddr 以指向下一个页面，继续处理下一页
        size -= _pageSize;
        vaddr += _pageSize;
    }
}
```

 

### isUnmapped

用于检查给定的虚拟地址范围是否**未映射**

```c++
bool
EmulationPageTable::isUnmapped(Addr vaddr, int64_t size)
{
    // 起始地址必须是页面对齐的,否则断言失败
    assert(pageOffset(vaddr) == 0);
 	// 遍历范围内的每个页面，如果找到任何映射，返回false
    for (int64_t offset = 0; offset < size; offset += _pageSize)
        if (pTable.find(vaddr + offset) != pTable.end())
            return false;
 	// 如果所有页面都未映射，返回 true
    return true;
}
```



### lookup

用于在页表中查找给定虚拟地址的映射，并返回指向该映射的指针。如果没有找到对应的映射，则返回 `nullptr`。

```c++
const EmulationPageTable::Entry *
EmulationPageTable::lookup(Addr vaddr)
{
    // 页面对齐:将虚拟地址 vaddr 对齐到页面边界。这个操作确保地址与页面大小对齐，使得查找操作针对正确的页面起始地址进行
    Addr page_addr = pageAlign(vaddr);
    // 在页表中查找对齐后的虚拟地址
    // 使用 pTable.find(page_addr) 在页表中查找对齐后的虚拟地址 page_addr。
    // PTableItr 是 std::unordered_map<Addr, Entry>::iterator 类型的别名，表示页表的迭代器类型。
    // 如果找到映射，find 返回指向该映射的迭代器；如果找不到，返回 pTable.end()
    PTableItr iter = pTable.find(page_addr);
    // 如果 iter 等于 pTable.end()，表示没有找到对应的映射，返回 nullptr
    if (iter == pTable.end())
        return nullptr;
    // 如果找到了映射，返回指向 iter 所指向的 Entry 对象的指针
    return &(iter->second);
}
```

> 这种查找操作对于模拟环境中的地址转换和内存管理非常有用

> `const EmulationPageTable::Entry *` 表示返回一个指向 `EmulationPageTable::Entry` 类型的常量指针。

```c++
    struct Entry
    {
        Addr paddr;
        uint64_t flags;
 		// 有参无参构造函数
        Entry(Addr paddr, uint64_t flags) : paddr(paddr), flags(flags) {}
        Entry() {}
    };
```



### translate （bool）

用于将虚拟地址转换为物理地址。如果转换成功，返回 `true` 并通过引用参数 `paddr` 返回物理地址；如果转换失败，返回 `false`

```c++
bool
EmulationPageTable::translate(Addr vaddr, Addr &paddr)
{
    // 查找虚拟地址 vaddr 对应的页表条目
    const Entry *entry = lookup(vaddr);
    // 如果找不到条目，打印调试信息并返回 false
    if (!entry) {
        DPRINTF(MMU, "Couldn't Translate: %#x\n", vaddr);
        return false;
    }
    // 计算物理地址:pageOffset(vaddr) 计算虚拟地址 vaddr 在页面中的偏移量
    // 将偏移量加上找到的页表条目中的物理地址 entry->paddr，得到最终的物理地址 paddr。
    paddr = pageOffset(vaddr) + entry->paddr;
    DPRINTF(MMU, "Translating: %#x->%#x\n", vaddr, paddr);
    return true;
}
```



### translate (Fault)

用于将**请求**中的虚拟地址转换为物理地址。如果转换失败，则返回一个新的 `GenericPageTableFault` 对象；如果成功，则设置请求的物理地址，并检查请求是否跨越页面边界

```c++
Fault
EmulationPageTable::translate(const RequestPtr &req)
{
    Addr paddr;
    // 检查页面对齐:确保请求中的虚拟地址范围在同一页内。
    // pageAlign：函数用于将地址对齐到页面边界。
    // 不在同一页触发断言失败
    assert(pageAlign(req->getVaddr() + req->getSize() - 1) ==
           pageAlign(req->getVaddr()));
    // 调用 translate 函数：尝试将请求中的虚拟地址转换为物理地址。
    // 如果转换失败，返回一个新的 GenericPageTableFault 对象，表示转换失败。
    if (!translate(req->getVaddr(), paddr))
        return Fault(new GenericPageTableFault(req->getVaddr()));
    // 将转换后的物理地址设置到请求对象中
    req->setPaddr(paddr);
    // 检查跨页请求，检查请求是否跨越页面边界
    // 计算偏移量：(paddr & (_pageSize - 1)) 计算物理地址在页面中的偏移量。
    // 如果偏移量加上请求大小超过页面大小，则触发panic并输出错误信息
    if ((paddr & (_pageSize - 1)) + req->getSize() > _pageSize) {
        panic("Request spans page boundaries!\n");
        return NoFault;
    }
    return NoFault;
}
```

* **Details**

> 为什么`(paddr & (_pageSize - 1)) `可以计算物理地址在页面中的偏移量 ?

>在计算机系统中，内存通常是按页面（或页）来管理的，每一页有固定的大小，例如 4KB、8KB 或者其他大小。在这种情况下，页的大小通常用 `_pageSize` 表示。
>
>1. **页面大小和偏移量**
>
>- 假设 `_pageSize` 是页面的大小（通常是 4KB，即 4096 字节）。
>- 页面大小为 4096 字节，其二进制表示为 `1000000000000`。
>
>2. **位运算中的与操作**（&）
>
>- **在二进制中，一个数减去 1，数字的最低有效位的1会变成0，而这个1之后的所有0都会变成1,其它位保持不变**。
>
>3. **应用**
>
>- `(paddr & (_pageSize - 1))`，即 `paddr` 与页面大小减 1 的结果进行与运算，得到的是 `paddr` 在页面内偏移的部分，因为这个操作会清除掉 `paddr` 最高有效位（即大于等于页面大小的部分），只保留页面大小范围内的偏移部分。

>`e.g.`
>
>当页面大小为 4KB（4096 字节）时，假设物理地址 `paddr` 是 `0x12345`，我们来计算它在页面中的偏移量。
>
>`_pageSize = 4096`(1 0000 0000 0000)
>
>`paddr = 0x12345`
>
>页面大小减 1 的二进制表示是 `0 1111 1111 1111`，即十六进制表示是 `0xFFF`
>
>`(paddr & (_pageSize - 1))` 等价于 `(0x12345 & 0xFFF)`
>
>```yaml
>0x12345   -> 0001 0010 0011 0100 0101
>0xFFF     -> 0000 0000 1111 1111 1111
>-------------------------------------
>Result    -> 0000 0000 0011 0100 0101
>```



### translate (PageTableTranslationGen)

这段代码的主要功能是将给定的地址范围 `range` 进行页面对齐，然后尝试将每个地址翻译为物理地址。如果翻译失败，它将生成一个对应的错误对象，并将其记录在 `range.fault` 中

```c++
void
EmulationPageTable::PageTableTranslationGen::translate(Range &range) const
{
    // 获取页面大小，pt 是一个指向 EmulationPageTable 对象的指针
    // pageSize() 是 EmulationPageTable 中的一个方法，用于返回页面的大小
    const Addr page_size = pt->pageSize();
 	// 计算下一个对齐地址: 将 range.vaddr 地址向上对齐到最接近的页面边界。
    // roundUp 函数：通常是将 vaddr 向上取整到 page_size 的倍数，确保 next 是 vaddr 或者更大的页面对齐地址
    Addr next = roundUp(range.vaddr, page_size);
    // 处理特殊情况
    // 如果对齐后的地址与原始地址相同（即 vaddr 已经是页面对齐的），则将 next 增加一个页面大小，以确保 next 不等于 vaddr。
    if (next == range.vaddr)
        next += page_size;
    // 更新地址范围大小
    // 更新 range.size，确保 range.size 不超过从 vaddr 到 next 的大小，以确保不会超出原始范围的边界。
    range.size = std::min(range.size, next - range.vaddr);
 	// 调用地址翻译方法
    // 将 range.vaddr 地址翻译为物理地址 range.paddr。
    if (!pt->translate(range.vaddr, range.paddr))
        range.fault = Fault(new GenericPageTableFault(range.vaddr));
}
```



### serialize

将 `EmulationPageTable` 对象的数据序列化到 `CheckpointOut` 对象 `cp` 中

这种序列化方法通常用于将对象的状态保存到文件或者网络传输中，以便稍后能够重新加载该对象的状态。

```c++
void
EmulationPageTable::serialize(CheckpointOut &cp) const
{
    // 创建一个名为 "ptable" 的序列化区段，将数据序列化到 cp 中
    ScopedCheckpointSection sec(cp, "ptable");
    // 序列化表的大小:使用 paramOut 方法将 pTable 的大小序列化到 cp 中
    paramOut(cp, "size", pTable.size());
 	// 使用 count 计数器迭代每个 pTable 中的表项
    PTable::size_type count = 0;
    // 遍历并序列化每个表项
    for (auto &pte : pTable) {
        ScopedCheckpointSection sec(cp, csprintf("Entry%d", count++));
        paramOut(cp, "vaddr", pte.first);
        paramOut(cp, "paddr", pte.second.paddr);
        paramOut(cp, "flags", pte.second.flags);
    }
    // 确保 count 计数器的值与 pTable 的大小相等，即确保所有表项都已经被正确地序列化。
    assert(count == pTable.size());
}
```



### unserialize

从 `CheckpointIn` 对象 `cp` 中反序列化数据，恢复 `EmulationPageTable` 对象的状态

这种反序列化方法通常用于从文件或网络接收的数据中恢复对象的状态，以便后续使用。

```c++
void
EmulationPageTable::unserialize(CheckpointIn &cp)
{
    int count;
    // 使用 ScopedCheckpointSection 创建一个序列化区段，名称为 "ptable"
    ScopedCheckpointSection sec(cp, "ptable");
    // 使用 paramIn 方法从 cp 中读取名为 "size" 的参数，并将其存储到 count 变量中。这个参数表示了要反序列化的表项数量
    paramIn(cp, "size", count);
 	// 使用 for 循环迭代 count 次，即反序列化每个表项
    for (int i = 0; i < count; ++i) {
        // 使用 ScopedCheckpointSection 创建一个名为 "EntryN" 的序列化区段，其中 N 是当前迭代的索引。
        ScopedCheckpointSection sec(cp, csprintf("Entry%d", i));
 		// 使用 UNSERIALIZE_SCALAR 宏从 cp 中反序列化每个表项的虚拟地址 vaddr、物理地址 paddr 和标志 flags。
        Addr vaddr;
        UNSERIALIZE_SCALAR(vaddr);
        Addr paddr;
        uint64_t flags;
        UNSERIALIZE_SCALAR(paddr);
        UNSERIALIZE_SCALAR(flags);
 		// 使用 pTable.emplace(vaddr, Entry(paddr, flags)) 将反序列化的表项插入到 pTable 中。
        pTable.emplace(vaddr, Entry(paddr, flags));
    }
}
```



### externalize

将 `EmulationPageTable` 对象的状态外部化为一个字符串

通过迭代 `pTable` 中的每个表项，将虚拟地址和物理地址格式化为十六进制字符串，并用 ":" 和 ";" 分隔符组合成一个字符串序列

这种方法常用于将对象状态以文本格式输出，便于打印、调试或者与其他系统交互。

```c++
const std::string
EmulationPageTable::externalize() const
{
    // 创建字符串流对象,用于将数据转换为字符串格式
    std::stringstream ss;
    // 迭代 pTable 中的每个表项
    // 使用 for 循环遍历 pTable 容器，其中 PTable 是 std::unordered_map<Addr, Entry> 的别名
    // 表示虚拟地址到 Entry 结构的映射
    for (PTable::const_iterator it=pTable.begin(); it != pTable.end(); ++it) {
        // 下注->
        ss << std::hex << it->first << ":" << it->second.paddr << ";";
    }
    //返回序列化后的字符串
    return ss.str();
}
```

对每个表项执行以下操作：

- `std::hex`：设置流输出为十六进制格式。
- `it->first`：获取当前表项的虚拟地址（键）。
- `it->second.paddr`：获取当前表项的物理地址。
- 将虚拟地址和物理地址格式化为字符串，并用 ":" 分隔。
- 使用 ";" 分隔每个表项的输出，形成一个格式化的字符串序列。
