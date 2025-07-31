# QEMU Tutorial (Version 10.0.3)

> **@author** `Jiahao Lu @ XMU [Contact: lujhcoconut@foxmail.com]`
>
> **@last_update** `2025/07/31`



## 1. What is QEMU

QEMU is an open-source **system emulator** and **user-mode emulator**.

It can emulate various hardware platforms, such as x86, ARM, RISC-V, and PowerPC. Its main capabilities include:

* Virtualizing operating systems (e.g. running Linux or Windows)
* Emulating hardware components such as CPU, memory, and I/O devices
* Running programs across different architectures (e.g. executing ARM programs on an x86 host)
* Collaborating with KVM to support hardware-accelerated virtualization (only when the host and guest systems share the same architecture, such as x86)

In full-system emulation mode (`qemu-system-*`), QEMU acts as a **virtual machine monitor**, simulating a complete system environment that includes:

* **CPU** (e.g., x86, ARM)
* BIOS or UEFI firmware
* **Bootloaders** (e.g., GRUB)
* **Operating systems** (e.g., Linux, Windows)
* **Storage devices** (HDD/SSD), **network interfaces**, **USB**, and more

The emulated operating system runs **independently of the host system**, as if it were running on actual hardware provided by QEMU.



QEMU’s memory emulation is both **fundamental** and **intricate**, primarily reflected in the following aspects:

(i) Guest Physical Memory Emulation

* QEMU creates a **virtual physical memory region** for the guest system (e.g., 512MB, 2GB).
* This memory is allocated from a **contiguous address space** on the host and then mapped to the guest.
* Users can specify the memory size using the `-m` parameter.

```shell
qemu-system-x86_64 -m 2G -hda disk.img
```

(ii) **Memory Mapping and Paging Mechanisms**

* The guest operating system continues to use its own **virtual memory management**, including structures like **page tables** and the **TLB (Translation Lookaside Buffer)**.
* QEMU emulates **CPU memory accesses**, which involves handling **page table walks**, **TLB caching**, and **page faults**.
* Special APIs such as `MemoryRegion` and **address space abstractions** are used to support **device register mappings**, **DMA access**, and other hardware-level memory operations.

(iii) QEMU supports advanced features including:

- **NUMA topology**: enabling distributed memory across multiple nodes
- **HugePages**: improving memory access performance through large page mappings
- **Shared memory between multiple VMs**: supported via mechanisms such as `vhost-user` and `ivshmem`

(iv) **Host Memory Management and Security**

- QEMU allocates memory using system calls such as `mmap()`.
- Memory protection flags (e.g., `MAP_NORESERVE`, `MAP_SHARED_VALIDATE`) can be leveraged to optimize **security** and **performance**.
- DMA operations through device models like **virtio** also rely heavily on proper memory management.



**Instance**

```shell
qemu-system-x86_64 \
  -m 2048 \
  -kernel bzImage \
  -append "root=/dev/sda1 console=ttyS0" \
  -hda rootfs.img \
  -nographic
```

`-m 2048`: Allocates **2GB of memory** to the guest machine.

`-kernel bzImage`: Specifies the **Linux kernel image** to boot.

`-hda`: Sets the **hard disk image** (typically the root filesystem).

`-nographic`: Uses the **terminal** instead of a graphical interface (console output is redirected to the terminal).



## 2. Quick Start

* `download`

```shell
wget https://download.qemu.org/qemu-10.0.3.tar.xz
tar xvJf qemu-10.0.3.tar.xz
cd qemu-10.0.3
```

* `glib local env`

```shell
mkdir glib_local
cd glib_local
wget https://download.gnome.org/sources/glib/2.70/glib-2.70.0.tar.xz
tar xf glib-2.70.0.tar.xz
cd glib-2.70.0
mkdir build
cd build
meson --prefix=/home/dell/jhlu/learning/qemu_study/qemu-10.0.3/glib-local ..
ninja
sudo ninja install
```

* `write a bash build_qemu.sh `

  * ```shell
    #!/bin/bash
    
    export PKG_CONFIG_PATH="$(pwd)/glib-local/lib/x86_64-linux-gnu/pkgconfig:$PKG_CONFIG_PATH"
    export LD_LIBRARY_PATH="$(pwd)/glib-local/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"
    export PATH="$(pwd)/glib-local/bin:$PATH"
    
    echo "Using pkg-config from: $(which pkg-config)"
    echo "glib-2.0 version detected by pkg-config:"
    pkg-config --modversion glib-2.0
    
    ./configure "$@"
    ```

* `build`

```shell
ninja -C build
./build_qemu.sh
```

* `test`

```shell
ls build/qemu-system-*
./build/qemu-system-x86_64 --version
```

* qemu start

```shell
qemu-system-x86_64 -kernel /home/dell/jhlu/colloid/tpp/linux-6.3/arch/x86/boot/bzImage -initrd /home/dell/jhlu/learning/qemu_study/initramfs.gz -nographic -append "console=ttyS0 init=/init"
```



## 3. Memory Management in QEMU

### 3.1 Detailed Explanation of Command-Line Parameters

```shell
qemu-system-x86_64 -m size=2048,slots=4,maxmem=8192
```

`size`: Initial **base memory size** for the guest at boot time (unit: MB)

`slots`: Number of **configurable memory slots** (i.e., DIMM count) **(can be used for hot-plugging)**

`maxmem`: Maximum **total memory supported** by the guest (base memory + hot-pluggable memory)



## Related

### BusyBox

BusyBox is an extremely lightweight and versatile collection of command-line utilities. It integrates many common Unix/Linux commands—such as `ls`, `cp`, `mv`, `sh`, `grep`, `mount`, and others—into a single executable file, with each function invoked via symlinks or command-line parameters corresponding to the specific command.

* **Compact Size**: Ideal for resource-constrained environments such as embedded systems and routers.

* **Comprehensive Functionality**: Includes most essential Unix/Linux commands and utilities.

* **Flexible Configuration**: Can be compiled selectively to include only the commands you need.

* **Single Executable**: All tools are integrated into one binary file, simplifying system administration and maintenance.



#### Static compilation example of BusyBox

```shell
wget https://busybox.net/downloads/busybox-1.36.1.tar.bz2
tar xjf busybox-1.36.1.tar.bz2
cd busybox-1.36.1
make defconfig 
sed -i 's/^# CONFIG_STATIC is not set$/CONFIG_STATIC=y/' .config

make -j$(nproc)
make install
```

This will generate a statically compiled BusyBox and install it to `_install/`. Verify it again using the following command.

```shell
file _install/bin/busybox
```

Correct output should be like this

```shell
ELF 64-bit LSB executable, x86-64, statically linked, ...
```

Then

```shell
cd _install
mkdir -p dev proc sys
sudo mknod dev/console c 5 1
sudo mknod dev/null c 1 3
ln -sf /bin/busybox init
```

* You're preparing a minimal, bootable **initramfs root filesystem**. The main goals are:
  * To ensure the kernel can execute `/init` as the first user-space process after boot.
  * To enable essential I/O operations during early boot (e.g. logging, console access).
*  `cd _install`
  - This changes into the BusyBox install directory.
  - It contains the `bin/busybox` executable and will serve as the root of your initramfs.

* `mkdir -p dev proc sys` Creates required mount points for virtual filesystems:

  - `/dev`: holds device nodes like `console` and `null`.

  - `/proc`: used to expose kernel process info via `procfs`.

  - `/sys`: exposes hardware and kernel information via `sysfs`.

​	These are typically mounted by the init script during early boot for kernel–user space interaction.

* `sudo mknod dev/console c 5 1`
  * Creates the character device `/dev/console` with major 5, minor 1.
  * This device is crucial for console output—without it, you won't see kernel or init messages.
* `sudo mknod dev/null c 1 3` Creates `/dev/null` (major 1, minor 3), the "bit bucket".
  * Many programs rely on `/dev/null` to discard output.
  * Its absence can cause strange errors or crashes in user-space tools.
* `ln -sf /bin/busybox init` Creates a symbolic link from `/init` to BusyBox.
  * The Linux kernel looks for `/init` (not `/sbin/init`) after loading initramfs.
  * BusyBox is typically compiled statically and supports `--install` to simulate a multi-call binary.
  * Linking `/init` to BusyBox ensures that it gets executed first.

> ```
> can't run '/etc/init.d/rcS': No such file or directory
> ```

```shell
mkdir -p etc/init.d
cat > etc/init.d/rcS <<EOF
#!/bin/sh
mount -t proc none /proc
mount -t sysfs none /sys
echo "Welcome to minimal BusyBox system"
exec /bin/sh
EOF

chmod +x etc/init.d/rcS
```

```shell
find . | cpio -o --format=newc | gzip > ../../initramfs.gz
```

#### QEMU Start

```shell
qemu-system-x86_64 -kernel /home/dell/jhlu/colloid/tpp/linux-6.3/arch/x86/boot/bzImage -initrd /home/dell/jhlu/learning/qemu_study/initramfs.gz -nographic -append "console=ttyS0 init=/init"
```

**outputs:**

![](.\figures\busybox_qemu_output.png)

#### NUMA Support

```shell
qemu-system-x86_64 -kernel /home/dell/jhlu/colloid/tpp/linux-6.3/arch/x86/boot/bzImage -initrd /home/dell/jhlu/learning/qemu_study/initramfs.gz -m 2G -smp 2 -numa node,mem=1024 -numa node,mem=1024 -nographic -append "root=/dev/ram console=ttyS0 rdinit=/init"
```

**outputs:**

![](.\figures\qemu_numa.png)

## Good Habit

### 1. Efficiently retrieving error messages during compilation

```shell
make -j$(nproc) 2>&1 | tee build.log
# outputs
grep error build.log
```

