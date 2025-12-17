# 超参数优化【模拟退火SA】

模拟退火算法用于超参数优化是一个**可行且有实际应用价值的方法**

**+** 能跳出局部最优，支持定制扰动、柔性大

**-**  超参数多、空间大时仍需较多计算资源，收敛慢

[适用场景] 

* 超参数维数适中（如2~8个），训练代价可接受
* 搜索空间结构复杂，容易陷入局部最优
* 尤其适合**离散参数**或**组合型参数**空间，如神经网络结构搜索



## 典型流程

* 设定初始超参数及温度
  * 选择初始解（通常随机产生）
  * 设定初始温度 T
  * 设定终止温度 T_min 和降温函数

* 每次扰动产生新超参数

* 训练模型，评价新参数性能（如val loss）
  * 计算能量（目标函数）差 ΔE = E(x’) - E(x)

* 依据模拟退火准则接受还是拒绝新解
  * 若ΔE < 0（新解更优），则接受新解（x ← x’）
  * 若ΔE ≥ 0，则以概率接受新解

* 降温，重复直到规定迭代/温度下限
  * 重复一定次数，逐步降温 T ← αT （0<α<1）



## **Metropolis接受准则**

这是模拟退火算法的核心公式

```
概率接受更差解：p = exp( -ΔE / T )
```

* ΔE：新旧解的目标函数值之差
* T：当前温度。T 高时容易接受劣解，T 低时趋于贪心。





## 简单伪代码

```python
# 假设已实现邻域扰动和目标函数
T = T_init            # 初始温度
x = random_solution() # 初始解
while T > Tmin:
    for i in range(L):         # 每温度迭代L次
        x_new = neighbor(x)
        deltaE = E(x_new) - E(x)
        if deltaE < 0 or random() < exp(-deltaE/T):
            x = x_new
    T = T * alpha              # 降温
return x
```



## 典型问题举例

- **旅行商问题：**
  - 邻域扰动：交换两城市顺序（2-opt、3-opt）

- **函数极值搜索：**
  - 邻域扰动：在定义域内小随机步长变化
- **工厂排程问题：**
  - 邻域扰动：局部任务交换



## 内存领域问题举例

【稀疏加速器引导式缓存替换策略预取窗口的大小设置问题】

- 在cache中预取A矩阵的一部分数据，可以提升对B数据的替换决策效果（用来指导cache replacement）。
- 但是**预取空间(pre‐fetch size)的大小怎么分配很关键**：
  - 太小：prefetch的信息不够，导致缓存替换策略效果差（miss rate高）。
  - 太大：直接挤占了实际数据的cache空间，提高了cache miss，也可能造成counter溢出/浪费。
- **最优的预取空间随着不同的稀疏矩阵而变化**，而且其对性能影响有局部极值（多个局部最优点）。



【MICRO'25 SeaCache】

Step1: **根据稀疏度给出一个初始的prefetch大小。**

Step2: **运行时监控2个指标：**

* miss rate（B数据访问时没有足够prefetch counter的比例，太高说明预取空间太小）
* discard rate（prefetch时超出counter空间导致的丢弃比例，太高说明预取空间太大）

Step3: **每当统计周期结束**（例如每完成1/500的MAC），

* 如果miss rate高，增大预取空间；如果discard rate高，减小预取空间。
* 当这两个率均较低，无需调整。



**伪代码**

![](.\seacache-sa.png)



**实际代码**

```c
void update_prefetch_size() {
  double temperature = SA_INITIAL_TEMP * pow(SA_COOLING_RATE, sa_iteration_k);

  int num_samples = get_num_samples(temperature);

  sa_iteration_k++;

  // printf("---%d %d %lf\n", sa_iteration_k, num_samples, temperature);

  if ((sa_iteration_k % num_samples) != 0) {
    return;
  }

  if (lastaccept == 0) {
    double current_data_miss_rate =
        1.0 - ((double)(data_access_hit) / data_access_total);
    last_iteration_data_miss_rate = current_data_miss_rate;
    lastaccept = 1;

    double current_discard_rate;
    if (prefetch_increments == 0) {
      current_discard_rate = 0;
    } else {
      current_discard_rate = ((double)prefetch_discards) / prefetch_increments;
    }
    double current_no_counter_miss_rate =
        ((double)data_access_misses) / data_access_total;
    // printf("Discard Rate: %lf, %d %d \n", current_discard_rate,
    //        prefetch_discards, prefetch_increments);

    previous_prefetch_size = current_prefetch_size;

    if (current_discard_rate > RATE_THRESHOLD && current_data_miss_rate < 0.3) {
      current_prefetch_size *= 0.8;
    } else {
      if (current_data_miss_rate >= 0.3 &&
          current_discard_rate <= RATE_THRESHOLD) {
        current_prefetch_size *= 1.2;
      } else {
        if (current_data_miss_rate >= 0.3 &&
            current_discard_rate > RATE_THRESHOLD) {

          SAstage = 1;
          double perturbation =
              ((static_cast<double>(rand()) / RAND_MAX) - 0.5) * 0.2;
          current_prefetch_size *= (1.0 + perturbation);
        }
      }
    }

    current_prefetch_size = std::max(current_prefetch_size, 1.0 / 256.0);
    current_prefetch_size = std::min(current_prefetch_size, 0.10);

    prefetchSize = current_prefetch_size * inputcachesize;
    cachesize = inputcachesize - prefetchSize;

    elements_processed_since_last_adjustment = 0;
    prefetch_discards = 0;
    prefetch_increments = 0;
    data_access_misses = 0;
    data_access_hit = 0;
    data_access_total = 0;

    return;
  }

  double current_data_miss_rate =
      1.0 - ((double)(data_access_hit) / data_access_total);

  double delta_M = (double)((1.0 - last_iteration_data_miss_rate) -
                            (1.0 - current_data_miss_rate)) /
                   (1.0 - last_iteration_data_miss_rate);

  bool accept_change = false;
  if (delta_M < 0) {
    accept_change = true;
  } else {
    double acceptance_prob = exp(-delta_M / temperature);
    double random_val = static_cast<double>(rand()) / RAND_MAX;
    // printf("%lf %lf %lf\n", temperature, acceptance_prob, random_val);
    if (acceptance_prob > random_val) {
      accept_change = true;
    }
  }

  // printf("!!!!!! %d %d %lf last size: %lf  current size: %lf  last hit "
  //        "rate:%lf    current hit rate:%lf  change:%d \n",
  //        data_access_hit, data_access_total, current_data_miss_rate,
  //        previous_prefetch_size, current_prefetch_size,
  //        1.0 - last_iteration_data_miss_rate, 1.0 - current_data_miss_rate,
  //        accept_change);

  if (accept_change) {
    last_iteration_data_miss_rate = current_data_miss_rate;
    if (current_data_miss_rate < best_data_miss_rate) {
      best_data_miss_rate = current_data_miss_rate;
      best_prefetch_size = current_prefetch_size;
    }
    lastaccept = 1;
  } else {
    current_prefetch_size = previous_prefetch_size;

    lastaccept = 0;

    prefetchSize = current_prefetch_size * inputcachesize;
    cachesize = inputcachesize - prefetchSize;
    elements_processed_since_last_adjustment = 0;
    prefetch_discards = 0;
    prefetch_increments = 0;
    data_access_misses = 0;
    data_access_hit = 0;
    data_access_total = 0;

    return;
  }

  double current_discard_rate;
  if (prefetch_increments == 0) {
    current_discard_rate = 0;
  } else {
    current_discard_rate = ((double)prefetch_discards) / prefetch_increments;
  }
  double current_no_counter_miss_rate =
      ((double)data_access_misses) / data_access_total;
  // printf("Discard Rate: %lf, %d %d \n", current_discard_rate,
  // prefetch_discards,
  //       prefetch_increments);

  previous_prefetch_size = current_prefetch_size;

  if (current_discard_rate > RATE_THRESHOLD && current_data_miss_rate < 0.3) {
    current_prefetch_size *= 0.8;
  } else {
    if (current_data_miss_rate >= 0.3 &&
        current_discard_rate <= RATE_THRESHOLD) {
      current_prefetch_size *= 1.2;
    } else {

      if (current_data_miss_rate >= 0.3 &&
          current_discard_rate > RATE_THRESHOLD) {

        SAstage = 1;
        double perturbation =
            ((static_cast<double>(rand()) / RAND_MAX) - 0.5) * 1.0;
        current_prefetch_size *= (1.0 + perturbation);
      }
    }
  }

  current_prefetch_size = std::max(current_prefetch_size, 1.0 / 256.0);
  current_prefetch_size = std::min(current_prefetch_size, 0.1);

  prefetchSize = current_prefetch_size * inputcachesize;
  cachesize = inputcachesize - prefetchSize;

  elements_processed_since_last_adjustment = 0;
  prefetch_discards = 0;
  prefetch_increments = 0;
  data_access_misses = 0;
  data_access_hit = 0;
  data_access_total = 0;
}
```

**模拟退火在这里的作用：**

* 解决因“局部极值”造成的贪心法易陷入次优解的问题。
* 通过一定概率接受差解，跳出局部最优；随着“温度”降低，收敛到较优解。
* 在调整prefetch size空间分配这一高噪声、多极值问题上，能自适应取得可靠、接近最优的分配效果。