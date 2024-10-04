# sudo: no tty present and no askpass program specified 

[`Caused by chroot`]

这种情况一般是出在chroot到/mnt，导致主系统没有root权限等等，系统运行不了

需要去真实服务器位置执行解除挂载问题

```shell
sudo umount /mnt/dev/pts
sudo umount /mnt/dev
sudo umount /mnt/proc
sudo umount /mnt/sys
sudo umount /mnt
```

但也有可能遇到`Target is busy`

Case1：就几个进程，查一下杀了就行

```shell
sudo lsof +D /mnt/dev
```

Case2:    强制全杀了

```shell
sudo umount -l /mnt/dev/
```

最后

```shell
sudo reboot
```



现在重新ssh到终端就正常了