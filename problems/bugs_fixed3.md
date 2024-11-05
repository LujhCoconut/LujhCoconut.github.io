# 脚本环境冲突问题

* 以SST环境和`sudo`冲突为例

问题发生在使用SST集成的gem5时，使用示例代码中出现自动下载资源需要root权限。

`sudo sst --add-lib-path=./ sst/arm_example_parsec.py` 会出现环境出现问题

## 不可行的尝试

```shekl
sudo -E sst --add-lib-path=./ ...
```

实测没什么用

```
sudo visudo
>>> 添加
Defaults env_keep += "M5_PATH"
```

实测也没什么用



## 可行的尝试

Step1：把执行的命令封装成小脚本，在脚本里设置环境变量

```shell
#!/bin/bash
export M5_PATH=xxx
export SST_CORE_HOME=xxx
export LD_LIBRARY_PATH=xxx
export PATH=$SST_CORE_HOME/bin:$PATH

sst --add-lib-path=./ sst/arm_example_parsec.py
```

Step2：直接sudo

```shell
sudo ./test_sst.sh
```



## 其它类似的情况都可以这么做

例如跑SE模式

```shell
SST_DIR=/home/dell/jhlu/spec_full_system/gem5/ext/sst
RUN_DIR=/home/dell/jhlu/spec_v4/benchspec/CPU/500.perlbench_r/run/run_base_refrate_testarm-64.0000

cd $RUN_DIR || { echo "Failed to enter directory $RUN_DIR"; exit 1; }

export M5_PATH=/home/dell/jhlu/spec_full_system/gem5
export SST_CORE_HOME=/home/dell/jhlu/spec_full_system/gem5/ext/sst
export LD_LIBRARY_PATH=$SST_CORE_HOME/lib/sst-elements-library:/home/dell/jhlu/spec_full_system/gem5/build/ARM:$LD_LIBRARY_PATH
export PATH=$SST_CORE_HOME/bin:$PATH

sst -n 16  --add-lib-path="$SST_DIR" --output-dot="$SST_DIR/graph_log" \
 --output-directory="$SST_DIR/stats.txt"  --exit-after=0:0:10 "$SST_DIR/sst/arm_test_spec.py"
```

