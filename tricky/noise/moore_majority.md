# 投票【摩尔投票法】

**摩尔投票法（Boyer–Moore Majority Vote Algorithm）**
 是一种在 **O(n) 时间、O(1) 空间** 内，找出**数组中出现次数超过 ⌊n/2⌋ 的元素（多数元素）**的算法。



摩尔投票法就是：多数元素和其他元素两两抵消，剩下的一定是多数。



## 它解决什么问题？

给定一个数组，找出其中出现次数 **大于 n/2** 的元素（假设一定存在）。



### 核心思想

不同的元素两两“互相抵消”，最后剩下的那个一定是多数元素。



### 算法规则

维护两个变量：

- `candidate`：当前候选人
- `count`：当前票数

遍历数组：

1. 如果 `count == 0`
    → 选当前元素为 `candidate`
2. 如果当前元素 == `candidate`
    → `count++`
3. 否则
    → `count--`



### 示例代码

```cpp
int majorityElement(vector<int>& nums) {
    int candidate = 0;
    int count = 0;

    for (int x : nums) {
        if (count == 0) {
            candidate = x;
        }
        count += (x == candidate) ? 1 : -1;
    }
    return candidate;
}
```





## 重要注意点

**前提条件**: 必须保证多数元素存在

* 如果不保证存在，需要 **再扫一遍验证**

```cpp
int cnt = 0;
for (int x : nums)
    if (x == candidate) cnt++;

if (cnt > nums.size() / 2) return candidate;
else return -1;
```



## 操作系统与体系结构类似的应用场景

* 分布式系统 / 操作系统中的“多数一致”
  * 虽然实际系统里会有日志和版本号，但**候选人 + 计数器**的思想是一样的。
* 中断 / 设备抖动消除（Debounce）
  * 某个硬件信号可能短时间内来回抖动，需要判断“真实状态”
* 内存错误预测、软错误预测
  * 宇宙射线、电噪声可能导致 bit flip
  * 常见做法：**多次采样 + 多数表决**
  * 同一寄存器读 3 次 （→ 取多数值）



总结优势： 常数空间（O(1)），单遍扫描（Streaming），去噪声 