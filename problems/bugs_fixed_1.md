# Errors were encountered while processing

## 问题描述：

```shell
Errors were encountered while processing:
 xxxxx
 xxxxx
E: Sub-process /usr/bin/dpkg returned an error code (1)
```

## 解决方案：

（1）原理尚不清楚，但这样可以解决大多数问题

```shell
cd /var/lib/dpkg
sudo mv info info.bak
sudo mkdir info
sudo apt-get update
```

（2）依然有问题的，需要强制重新安装

```shell
sudo apt-get install --reinstall whoopsie
```

（3）很遗憾，第二个方案大多数情况下可能没用（否则你也不会来看教程了），因此需要尝试完全移除

```shell
sudo dpkg --remove --force-remove-reinstreq xxx
sudo apt-get remove xxx

sudo apt-get install -f
```

（4）如果很不幸，第三个方案也不行，则手动清理

```shell
sudo rm /var/lib/dpkg/info/xxxx.*
# 再次运行
sudo apt-get install -f
sudo dpkg --configure -a
```

* 一般来说这样就解决问题了

