# 统计优化【指数加权滑动平均EWMA】

EWMA 是对一组时序数据进行加权平均，但与普通滑动平均不同，其**新数据的权重更高，历史数据权重以指数形式递减**。这种方式使得 EWMA 对新的趋势较为敏感，对噪声抑制效果也佳，是一种高效的时间序列平滑技术。

**-** **不适合长周期剧变判断**，更适合抑制高频小波动、捕捉短期趋势。



对于一组数据 $x1$,$x2$,$x3$,...，EWMA 的递推公式为：

$S_{t}=\alpha \cdot x_{t}+(1-\alpha) \cdot S_{t-1}$

* $S_{t}$ ：当前时刻的EWMA值
* $x_{t}$ ：当前时刻的新观测值
* $\alpha$:  平滑因子（$0<\alpha <1$），越接近1表示对新值越敏感，越小则更加平滑

> 初始值 S0 通常可设为第一条数据 x1 或数据的均值

序列展开

$S_{t}=\alpha x_{t}+\alpha(1-\alpha)x_{t-1}+\cdot \cdot \cdot +(1-\alpha)^{t-1}x_{1}$



## python逐步表示法

```python
def ewma(data, alpha):
    S = data[0]     # 初始值
    result = [S]
    for x in data[1:]:
        S = alpha * x + (1 - alpha) * S
        result.append(S)
    return result
```



## 内存领域应用举例

Colloid-SOSP'24

> `"We apply Exponentially Weighted Moving Averaging (EWMA) on the both the occupancy and rate measurements to smooth noise in the signals."`

Memstrata-OSDI'24

> `"To reduce the effect of short-term variations, we employ an exponentially weighted moving average (EWMA) to smooth the performance metrics derived from the event counts (EWMA constant α = 0.2, by default)."`