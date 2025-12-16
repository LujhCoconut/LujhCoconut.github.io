# LD_PRELOAD拦截库函数

**系统调用**是程序从用户空间请求内核服务的唯一方式（如 `open`， `read`， `write`， `fork`）。它们通过软中断（如 `int 0x80`或 `syscall`指令）直接进入内核。用户程序通常不直接调用系统调用。

**库函数**是标准库（如 glibc）提供的封装函数。例如，`fopen`， `printf`， `malloc`等。它们内部**可能会使用一个或多个系统调用**来完成任务。



## Q1: 如何通过劫持库函数来影响系统调用 ?

这是最常见的使用模式：通过劫持一个封装了系统调用的库函数，来监控、修改或阻止其行为。

**示例：记录所有文件打开操作**

```C++
#define _GNU_SOURCE
#include <stdio.h>
#include <dlfcn.h>
#include <stdarg.h>
#include <string.h>

// 定义原版 fopen 的函数指针
FILE *(*original_fopen)(const char *pathname, const char *mode) = NULL;

FILE *fopen(const char *pathname, const char *mode) {
    // 1. 使用 dlsym 获取真正的 fopen 函数地址
    if (original_fopen == NULL) {
        original_fopen = dlsym(RTLD_NEXT, "fopen");
    }

    // 2. 执行我们的逻辑：打印日志
    printf("[LOG] fopen: 尝试打开文件 %s (模式: %s)\n", pathname, mode);

    // 3. 可以选择性地调用原始函数，或完全绕过
    FILE *fp = original_fopen(pathname, mode);
    if (fp) {
        printf("[LOG] fopen: 成功打开 %s\n", pathname);
    } else {
        printf("[LOG] fopen: 打开失败 %s\n", pathname);
    }
    return fp;
}
```

**编译与使用**：

```SHELL
# 编译为动态库
gcc -shared -fPIC file_hijack.c -o file_hijack.so -ldl

# 劫持一个命令（如 ls）的文件操作
LD_PRELOAD=./file_hijack.so ls /tmp
```

运行后，`ls`命令在内部调用 `fopen`时，都会先执行我们自定义的版本，从而记录日志。



### 常见劫持目标

* **I/O 操作**：`fopen`， `fread`， `fwrite`， `open`， `close`
* **内存操作**：`malloc`， `calloc`， `realloc`， `free`
* **网络操作**：`connect`， `send`， `recv`
* **字符串/时间**：`strcmp`， `gettimeofday`， `rand`



### 限制与规避

LD_PRELOAD并非万能，有许多安全机制会限制它：

* **静态链接的程序**：无效。因为函数地址在编译时已确定。
* **SUID/SGID 程序**：出于安全考虑，系统会忽略对设置了 `setuid`/`setgid`位（如 `/usr/bin/passwd`， `sudo`）的程序的 `LD_PRELOAD`。这是为了防止权限提升攻击。
* **完整静态系统调用**：如果程序通过 `syscall()`或内联汇编直接发起系统调用，`LD_PRELOAD`无法拦截。
* **其他安全模块**：SELinux、AppArmor 等可以配置规则来禁止 `LD_PRELOAD`。



## Q2: **对象跟踪和对象流分析**

[OSDI'25 SOAR]([SoarAlto/src/soar/interc/ldlib.c at main · MoatLab/SoarAlto](https://github.com/MoatLab/SoarAlto/blob/main/src/soar/interc/ldlib.c))

将程序运行时离散的内存分配/释放事件，通过调用栈信息关联起来，聚合成有意义的“对象流”，从而分析其使用模式.

函数拦截原理

```
原始程序调用 malloc() 
    ↓
被 LD_PRELOAD 加载的库中的 malloc() 截获
    ↓
自定义的 malloc() 执行额外逻辑（记录、分析、优化等）
    ↓
调用 libc_malloc() 执行真正的内存分配
    ↓
返回给原始程序
```



首先需要定义每次内存分配或释放的详细记录：

```c
struct log {
    uint64_t rdt; /* 时间戳记录 */
    void *addr; /* 分配或释放内存的地址 */
    size_t size; /* 分配或释放的内存大小 */
    long entry_type; /* 0 free 1 malloc >=100 mmap */
    size_t callchain_size; /* 调用栈深度 */
    void *callchain_strings[CALLCHAIN_SIZE]; /* 调用栈地址数组 */
};
```

本代码中调用栈的设计目的是获取内存分配或释放的详细上下文信息。



### malloc

```c++
extern "C" void *malloc(size_t sz)
{
    /* 初始化 libc 的原始 malloc 函数 */
    if (!libc_malloc)
        m_init();
    void *addr;
    /* 指向当前线程的日志记录对象，用于保存此次分配操作的相关信息 */
    struct log *log_arr;
    if (!_in_trace) { /* 用于防止递归调用【1】 */
        log_arr = get_log(); /* 获取当前线程用于记录日志的结构 */
        if (log_arr) {
            rdtscll(log_arr->rdt);
            log_arr->size = sz;
            log_arr->entry_type = 1;
            get_trace(&log_arr->callchain_size, log_arr->callchain_strings);
        }
    }/* 处理大块分配（sz > 4096） */
    if (sz > 4096 && !_in_trace && log_arr) {
        if (log_arr->callchain_size >= 4) {
            char **strings = backtrace_symbols (log_arr->callchain_strings, log_arr->callchain_size);
            int ret = check_trace(strings[3], sz);
            libc_free(strings);
            if (ret > -1) {
                addr = numa_alloc_onnode(sz, ret);
                record_seg((unsigned long)addr, sz);
            } else {
                addr = libc_malloc(sz);
            }
        } else {
            addr = libc_malloc(sz);
        }
    } else {
        addr = libc_malloc(sz);
    }
    return addr;
}
```

注释：

【1】`malloc` 可能在调用栈跟踪或记录日志时再次触发（例如，`backtrace` 或 `dlsym` 函数可能内部调用了 `malloc`），因此需要防止进入无限递归。



### **如何跟踪对象的生命周期？**

#### **S1: 拦截内存分配和释放操作**

```c
// 拦截 malloc 并记录时间
extern "C" void *malloc(size_t sz) {
    void *addr = libc_malloc(sz);  // 调用真实的 malloc
    log_allocation(addr, sz);      // 记录分配日志
    return addr;
}

// 拦截 free 并记录时间
extern "C" void free(void *p) {
    log_deallocation(p);           // 记录释放日志
    libc_free(p);                  // 调用真实的 free
}
```

`libc_malloc`和 `libc_free`是通过 LD_PRELOAD技术劫持系统内存分配函数时保存原始函数指针的变量。它们是实现函数拦截的关键机制。（通过 `dlsym(RTLD_NEXT, ...)` 获取）



#### S2: **记录时间戳**

在分配和释放操作时分别记录准确的时间戳，帮助衡量生命周期。时间戳可以通过以下方法获取：

* **使用 CPU 的时间戳计数器（RDTSC 指令）：**

```C
#define rdtscll(val) \
    asm volatile("rdtsc" : "=A" (val))

uint64_t timestamp;
rdtscll(timestamp);  // 获取当前时间戳
```

该方法获取的是高精度 CPU 时钟计数，相对较快，尤其适合分析短时间内的内存分配。

* **使用标准时间（`gettimeofday`）：**

```C
struct timeval tv;
gettimeofday(&tv, NULL);
uint64_t timestamp = tv.tv_sec * 1000000 + tv.tv_usec;  // 当前时间（微秒）
```

**记录时间戳：** 将时间戳存储在对象元数据信息中，用于后续分析：

```C
log->Talloc = timestamp;  // 分配时间记录
```



#### S3: **关联对象与操作**

当捕获到分配操作的内存地址（`vaddr`）时，将该地址用作所有日志记录的核心 "主键"。在释放操作中，通过该地址去匹配对应的分配操作。

**方法实现：**

**分配时：**

- 在内部的数据结构中保存分配日志，使用虚拟地址 `vaddr` 作为键，日志记录分配时间、大小、调用来源等信息。

```C
void log_allocation(void *addr, size_t size) {
    struct log entry;
    rdtscll(entry.Talloc);    // 记录当前分配时间
    entry.vaddr = (unsigned long) addr;  // 保存虚拟地址
    entry.size = size;        // 保存分配大小
    entry.type = 1;           // 操作类型（malloc）
    entry.Tfree = 0;          // 尚未释放的对象

    // 插入日志：vaddr 为键
    store_log(addr, &entry);
}
```

**释放时：**

- 找到匹配的地址日志，并记录释放时间。

```C
void log_deallocation(void *p) {
    struct log *entry = find_log_by_vaddr(p);
    if (entry) {
        rdtscll(entry->Tfree);  // 记录释放时间
    }
}
```

**查询与更新：**

日志结构（如哈希表或平衡树等）提供快速查询方法：

* `store_log()` 用于插入日志。
* `find_log_by_vaddr()` 用于查询虚拟地址对应的日志。



#### S4: **分组对象生命周期（调用栈归类）**

所有内存分配操作通过调用栈（`backtrace()`）分组，分组机制是对象生命周期建模的关键：

- **调用栈（Call Stack）:** 获取分配发生时的调用路径，判断对象属于哪段代码逻辑。
- **分组依据:** 相同调用路径的对象表明这些对象来源于同一逻辑模块，具有类似的行为模式。

```C
void log_allocation(void *vaddr, size_t sz) {
    ...
    size_t callchain_size;
    void *callchain[MAX_CALLCHAIN_SIZE];
    callchain_size = backtrace(callchain, MAX_CALLCHAIN_SIZE);  // 获取调用栈

    // 保存调用栈到日志
    memcpy(entry.callchain_strings, callchain, sizeof(void*) * callchain_size);
    entry.callchain_size = callchain_size;

    store_log(vaddr, &entry);  // 插入日志
}
```

通过调用栈归类，可以实现：

* 分析相同调用路径的对象分配模式。
* 发现内存热点及高频分配行为



#### S5: **匹配生命周期并分析**

一旦分配和释放日志被记录完成，可以通过以下方式计算和分析对象生命周期：

* **匹配日志：**

  * 遍历分配日志，找到 `Talloc` 与 `Tfree`。
  * 如果 `Tfree = 0`，则说明未释放，可能是**内存泄漏**。

* **计算生命周期：**

  * ```
    lifetime = entry.Tfree - entry.Talloc;
    ```

* **输出分析：**

  * 输出所有对象生命周期，分析它们的分配和释放趋势。

  * 示例输出：

    * ```
      Object VADDR=0xabcdef, AllocTime=12345, FreeTime=13456, Lifetime=1111 μs
      ```