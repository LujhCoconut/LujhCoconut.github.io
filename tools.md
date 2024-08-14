



# 工具链（实用主义）

## Linux基础技能

实用主义至上，遇到不常见指令/操作可以查手册、查网页。

（Read The Friendly Mamual , Search The Friendly Web , Read The Fucking Source Code !）

### Linux基本命令

```
Ctrl + c : 取消命令并且换行
Ctrl + u : 清空本行命令
tab		 : 自动补全
history  : 历史命令
pwd      : 显示当前路径
复制文本   : windows/Linux下：Ctrl + insert，Mac下：command + c
粘贴文本   : windows/Linux下：Shift + insert，Mac下：command + v
chmod +x  : 增加可执行权限
```



#### ls(list directory contents）

用于显示指定工作目录下之内容（列出目前工作目录所含的文件及子目录)。

```
ls [-alrtAFR] [name...]
```

```
ls -l                    # 以长格式显示当前目录中的文件和目录
ls -a                    # 显示当前目录中的所有文件和目录，包括隐藏文件
ls -lh                   # 以人类可读的方式显示当前目录中的文件和目录大小
ls -t                    # 按照修改时间排序显示当前目录中的文件和目录
ls -R                    # 递归显示当前目录中的所有文件和子目录
```

ls 命令还可以使用通配符进行模式匹配，例如 ***** 表示匹配任意字符，**?** 表示匹配一个字符，**[...]** 表示匹配指定范围内的字符。

```
ls *.txt         # 列出所有扩展名为.txt的文件
ls file?.txt     # 列出文件名为file?.txt的文件，其中?表示任意一个字符
ls [abc]*.txt    # 列出以a、b或c开头、扩展名为.txt的文件
```



#### cd (change directory)

用于改变当前工作目录的命令，切换到指定的路径

**~** 也表示为 home 目录 的意思， **.** 则是表示目前所在的目录， **..** 则表示目前目录位置的上一层目录。

```
cd [dirName]
```

**切换到上级目录：**使用 **..** 表示上级目录，可以通过连续多次使用 **..** 来切换到更高级的目录。

```
cd ..
cd ../../   // 切换到上上级目录
```

**切换到用户主目录（home）：**使用 **~** 表示当前用户的主目录，可以使用 cd 命令直接切换到主目录。

```
cd ~
```

**切换到上次访问的目录：**使用 **cd -** 可以切换到上次访问的目录。

```
cd -
```



#### cp(copy file)

主要用于复制文件或目录

```
cp [options] source dest 或 cp [选项] 源文件 目标文件
```

用户使用该指令复制目录时，必须使用参数 **-r** 或者 **-R** 。





#### mkdir(make directory)

用于创建目录  -p 确保目录名称存在，不存在的就建一个

```
mkdir [-p] dirName
```





#### rm(remove)

用于删除一个文件或者目录

```
rm [options] name...
```

删除文件可以直接使用rm命令，若删除目录则必须配合选项"-r"

```
rm  test.txt 
rm  -r  homework
```

删除当前目录下的所有文件及目录，命令行为：

```
rm  -r  * 
```

```
rm *.txt
```





#### mv(move file)

用来为文件或目录改名、或将文件或目录移入其它位置

```
mv [options] source dest
mv [options] source... directory
```

将源文件名 source_file 改为目标文件名 dest_file (重命名)

```
mv source_file(文件) dest_file(文件)
```

将文件 source_file 移动到目标目录 dest_directory 中

```
mv source_file(文件) dest_directory(目录)
```

目录名 dest_directory 已存在，将 source_directory 移动到目录名 dest_directory 中；目录名 dest_directory 不存在则 source_directory 改名为目录名 dest_directory

```
mv source_directory(目录) dest_directory(目录)
```





#### cat(concatenate）

命令用于连接文件并打印到标准输出设备上

```
cat [-AbeEnstTuv] [--help] [--version] fileName
```

**-n 或 --number**：由 1 开始对所有输出的行数编号。

**-b 或 --number-nonblank**：和 -n 相似，只不过对于空白行不编号。

**-s 或 --squeeze-blank**：当遇到有连续两行以上的空白行，就代换为一行的空白行。

清空 /etc/test.txt 文档内容：

```
cat /dev/null > /etc/test.txt
```

cat 也可以用来制作镜像文件。例如要制作软盘的镜像文件，将软盘放好后输入：

```
cat /dev/fd0 > OUTFILE
```

相反的，如果想把 image file 写到软盘，输入：

```
cat IMG_FILE > /dev/fd0
```





### 常用技能和连招

* 要只显示除过第一行的其他所有行

```shell
head -n +2 [your_file]
```

* 输出目录内所有文件和文件大小信息，按大小升序排列

```shell
 在当前目录下命令行输入
 du -sh * | sort -h
```



------



### tmux

功能  (1）分屏  （2）允许断开Terminal连接后，继续运行进程

tmux 结构： 一个tmux可以包含多个session，一个session可以包含多个window，一个window可以包含多个pane

tmux:
                session 0:
                    window 0:
                        pane 0
                        pane 1
                        pane 2
                        ...
                    window 1
                    window 2
                    ...
                session 1
                session 2
                ...

 tmux：新建一个session，其中包含一个window，window中包含一个pane，pane里打开了一个shell对话框。

**(原生 tmux 应该是 Ctrl + b 作为引导手势)**

```
Ctrl + a 按住后松手 再按 % ，左右分屏
Ctrl + a 按住后松手 再按 “ ，上下分屏
Ctrl + d 关闭当前pane；如果当前window的所有pane均已关闭，则自动关闭window，以此类推
Ctrl + a 按住后松手 再按方向键 ，切换到相邻的Pane
Ctrl + a 同时按方向键 ，可以改变Pane的分割线
Ctrl + a 按住后松手 再按 z ，可以全屏/取消全屏Pane
Ctrl + a 按住后松手 再按 d ，可以挂起当前Session
tmux a   打开当前挂起的Session
Ctrl + a 按住后松手 再按 s ，选择其他Session
			方向键 —— 上：选择上一项 session/window/pane
            方向键 —— 下：选择下一项 session/window/pane
            方向键 —— 右：展开当前项 session/window
            方向键 —— 左：闭合当前项 session/window
Ctrl + a 按住后松手，再按PageUp/PageDown：翻阅当前pane内的内容。
在tmux中选中文本时，需要按住shift键
tmux中复制/粘贴文本的通用方式：
            (1) 按下Ctrl + a后松开手指，然后按[
            (2) 用鼠标选中文本，被选中的文本会被自动复制到tmux的剪贴板
            (3) 按下Ctrl + a后松开手指，然后按]，会将剪贴板中的内容粘贴到光标处
```

------



### vim (vim组合技)

 功能：
        (1) 命令行模式下的文本编辑器。
        (2) 根据文件扩展名自动判别编程语言。支持代码缩进、代码高亮等功能。
        (3) 使用方式：vim filename
            如果已有该文件，则打开它。
            如果没有该文件，则打开个一个新的文件，并命名为filename



模式：
        (1) 一般命令模式
            默认模式。命令输入方式：类似于打游戏放技能，按不同字符，即可进行不同操作。可以复制、粘贴、删除文本等。
        (2) 编辑模式
            在一般命令模式里按下i，会进入编辑模式。
            按下ESC会退出编辑模式，返回到一般命令模式。
        (3) 命令行模式
            在一般命令模式里按下  : / ? 三个字母中的任意一个，会进入命令行模式。命令行在最下面。
            可以查找、替换、保存、退出、配置编辑器等。



组合技等切记区分大小写

```
 操作：
        (1) i：进入编辑模式
        (2) ESC：进入一般命令模式
        (3) h 或 左箭头键：光标向左移动一个字符
        (4) j 或 向下箭头：光标向下移动一个字符
        (5) k 或 向上箭头：光标向上移动一个字符
        (6) l 或 向右箭头：光标向右移动一个字符
        (7) n<Space>：n表示数字，按下数字后再按空格，光标会向右移动这一行的n个字符
        (8) 0 或 功能键[Home]：光标移动到本行开头
        (9) $ 或 功能键[End]：光标移动到本行末尾
        (10) G：光标移动到最后一行
        (11) :n 或 nG：n为数字，光标移动到第n行
        (12) gg：光标移动到第一行，相当于1G
        (13) n<Enter>：n为数字，光标向下移动n行
        (14) /word：向光标之下寻找第一个值为word的字符串。
        (15) ?word：向光标之上寻找第一个值为word的字符串。
        (16) n：重复前一个查找操作
        (17) N：反向重复前一个查找操作
        (18) :n1,n2s/word1/word2/g：n1与n2为数字，在第n1行与n2行之间寻找word1这个字符串，并将该字符串替换为word2
        (19) :1,$s/word1/word2/g：将全文的word1替换为word2
        (20) :1,$s/word1/word2/gc：将全文的word1替换为word2，且在替换前要求用户确认。
        (21) v：选中文本
        (22) d：删除选中的文本
        (23) dd: 删除当前行(剪切)
        (24) y：复制选中的文本
        (25) yy: 复制当前行
        (26) p: 将复制的数据在光标的下一行/下一个位置粘贴
        (27) u：撤销
        (28) Ctrl + r：取消撤销
        (29) 大于号 >：将选中的文本整体向右缩进一次
        (30) 小于号 <：将选中的文本整体向左缩进一次
        (31) :w 保存
        (32) :w! 强制保存
        (33) :q 退出
        (34) :q! 强制退出
        (35) :wq 保存并退出
        (36) :set paste 设置成粘贴模式，取消代码自动缩进
        (37) :set nopaste 取消粘贴模式，开启代码自动缩进
        (38) :set nu 显示行号
        (39) :set nonu 隐藏行号
        (40) gg=G：将全文代码格式化
        (41) :noh 关闭查找关键词高亮
        (42) Ctrl + q：当vim卡死时，可以取消当前正在执行的命令
```

异常处理：
        每次用vim编辑文件时，会自动创建一个.filename.swp的临时文件。
        如果打开某个文件时，该文件的swp文件已存在，则会报错。此时解决办法有两种：
            (1) 找到正在打开该文件的程序，并退出
            (2) 直接删掉该swp文件即可



------

------



## Shell

### 概论

shell是我们通过命令行与操作系统沟通的语言。

shell脚本可以直接在命令行中执行，也可以将一套逻辑组织成一个文件，方便复用。

Linux中常见的shell脚本有很多种，常见的有：(注意：不同版本，略有区别！使用时注意RTFM！)

```
* Bourne Shell(/usr/bin/sh或/bin/sh)
* Bourne Again Shell(/bin/bash)
* C Shell(/usr/bin/csh)
* K Shell(/usr/bin/ksh)
* zsh
…
```

Linux系统中一般默认使用bash，所以接下来讲解bash中的语法。
文件开头需要写#! /bin/bash，指明bash为脚本解释器。

新建一个test.sh文件，内容如下：

```shell
$ vim test.sh

#! /bin/bash
echo "Hello World!"
```



运行方式

```
1 作为可执行文件
2 用解释器执行
```

```shell
1 作为可执行文件
chmod +x test.sh  # 使脚本具有可执行权限   r(read) w(write) x(execute)
./test.sh  # 当前路径下执行
/home/acs/test.sh  # 绝对路径下执行
~/test.sh  # 家目录路径下执行
```

```shell
2 用解释器执行
bash test.sh
```



### 注释

单行注释

```
# 这是一行注释
```

多行注释

```shell
:<<EOF
第一行注释
第二行注释
第三行注释
EOF


EOF可以替换为其它字符串

:<<abc
第一行注释
第二行注释
第三行注释
abc

:<<!
第一行注释
第二行注释
第三行注释
!

# 多行注释不加前面的冒号好像也能用
```



### 变量

#### 定义变量

定义变量，不需要加$符号，例如：

```shell
name1='zjnu'  # 单引号定义字符串
name2="xmu"  # 双引号定义字符串
name3=coconut    # 也可以不加引号，同样表示字符串
```



#### 使用变量

使用变量，需要加上$符号，或者${}符号。花括号是可选的，主要为了帮助解释器识别变量边界。

```shell
name=coco
echo $name  # 输出coco
echo ${name}  # 输出coco
echo ${name}nut  # 输出coconut
```



#### 只读变量

使用 readonly 或者 declare 可以将变量变为只读。

```shell
name=coconut
readonly name
declare -r name  # 两种写法均可

name=abc  # 会报错，因为此时name只读
```



#### 删除变量

unset可以删除变量。

```shell
name=coconut
unset name
echo $name  # 输出空行
```



#### 变量类型

1.  自定义变量（局部变量）----------- 子进程不能访问的变量
2.  环境变量（全局变量）------------- 子进程可以访问的变量



自定义变量改成环境变量：

```shell
acs@9e0ebfcd82d7:~$ name=coconut  # 定义变量
acs@9e0ebfcd82d7:~$ export name  # 第一种方法
acs@9e0ebfcd82d7:~$ declare -x name  # 第二种方法
```

环境变量改为自定义变量：

```shell
acs@9e0ebfcd82d7:~$ export name=coconut  # 定义环境变量
acs@9e0ebfcd82d7:~$ declare +x name  # 改为自定义变量
```



#### 字符串

字符串可以用单引号，也可以用双引号，也可以不用引号。

单引号与双引号的区别：

* 单引号中的内容会原样输出，不会执行、不会取变量；
*  双引号中的内容可以执行、可以取变量；

```shell
name=coconut  # 不用引号
echo 'hello, $name \"hh\"'  # 单引号字符串，输出 hello, $name \"hh\"
echo "hello, $name \"hh\""  # 双引号字符串，输出 hello, coconut "hh"
```

获取字符串长度

```shell
name="coconut"
echo ${#name}  # 输出7
```

提取子串

```shell
name="hello, coconut"
echo ${name:0:5}  # 提取从0开始的5个字符
```



### 默认变量

文件参数变量

在执行shell脚本时，可以向脚本传递参数。$1是第一个参数，$2是第二个参数，以此类推。特殊的，**$0是文件名（包含路径）**。例如：

创建文件test.sh：

```shell
#! /bin/bash

echo "文件名："$0
echo "第一个参数："$1
echo "第二个参数："$2
echo "第三个参数："$3
echo "第四个参数："$4

(注意两位数及以上： ${10},${100})
```

然后执行该脚本：

```shell
acs@9e0ebfcd82d7:~$ chmod +x test.sh 
acs@9e0ebfcd82d7:~$ ./test.sh 1 2 3 4
文件名：./test.sh
第一个参数：1
第二个参数：2
第三个参数：3
第四个参数：4
```

其它参数相关变量

```
$#	代表文件传入的参数个数，如上例中值为4
$*	由所有参数构成的用空格隔开的字符串，如上例中值为"$1 $2 $3 $4"
$@	每个参数分别用双引号括起来的字符串，如上例中值为"$1" "$2" "$3" "$4"
$$	脚本当前运行的进程ID
$?	上一条命令的退出状态（注意不是stdout，而是exit code）。0表示正常退出，其他值表示错误
$(command)	返回command这条命令的stdout（可嵌套）
`command`	返回command这条命令的stdout（不可嵌套）
```



### 数组

数组中可以存放多个不同类型的值，**只支持一维数组**，初始化时不需要指明数组大小。数组下标从0开始。

定义
数组用小括号表示，元素之间用**空格**隔开。例如：

```shell
array=(1 abc "def" coconut)
```

也可以直接定义数组中某个元素的值：

```shell
array[0]=1
array[1]=abc
array[2]="def"
array[3]=coconut
```

读取数组中某个元素的值

```shell
${array[index]}
```

```shell
array=(1 abc "def" coconut)
echo ${array[0]}
echo ${array[1]}
echo ${array[2]}
echo ${array[3]}
```

读取整个数组

```shell
${array[@]}  # 第一种写法
${array[*]}  # 第二种写法
```

数组长度(真*元素个数)

```shell
${#array[@]}  # 第一种写法
${#array[*]}  # 第二种写法
```

```shell
array=(1 abc "def" coconut)

echo ${#array[@]}  # 第一种写法
echo ${#array[*]}  # 第二种写法
```



### expr命令

expr命令用于求表达式的值，格式为：

```
expr 表达式
```

表达式说明：

* 用空格隔开每一项
*  用反斜杠放在shell特定的字符前面（发现表达式运行错误时，可以试试转义）
* 对包含空格和其他特殊字符的字符串要用引号括起来
* **expr会在stdout中输出结果。如果为逻辑关系表达式，则结果为真时，stdout输出1，否则输出0。**
* **expr的exit code：如果为逻辑关系表达式，则结果为真时，exit code为0，否则为1。**



#### 字符串表达式



```
length STRING
```

返回STRING的长度

```
index STRING CHARSET
```

CHARSET中**任意单个字符在STRING中最前面的字符位置**，下标从1开始。如果在STRING中完全**不存在**CHARSET中的字符，则返回**0**。

```
substr STRING POSITION（起始位置） LENGTH（字串长度）
```

返回STRING字符串中从POSITION开始，长度最大为LENGTH的子串。如果POSITION或LENGTH为负数，0或非数值，则返回空字符串。

e.g.

```shell
str="Hello World!"

echo `expr length "$str"`  # ``不是单引号，表示执行该命令，输出12
echo $(expr length "$str") # 第二张写法 下面类似
echo `expr index "$str" aWd`  # 输出7，下标从1开始
echo `expr substr "$str" 2 3`  # 输出 ell
```



#### 整数表达式

expr支持普通的算术操作，算术表达式优先级低于字符串表达式，高于逻辑关系表达式。

+ ”+  -“
加减运算。两端参数会转换为整数，如果转换失败则报错。

* ” * / % “
乘，除，取模运算。两端参数会转换为整数，如果转换失败则报错。* 需要转义。

* () 可以改变优先级，但需要用反斜杠转义

```shell
a=3
b=4

echo `expr $a + $b`  # 输出7
echo `expr $a - $b`  # 输出-1
echo `expr $a \* $b`  # 输出12，*需要转义
echo `expr $a / $b`  # 输出0，整除
echo `expr $a % $b` # 输出3
echo `expr \( $a + 1 \) \* \( $b + 1 \)`  # 输出20，值为(a + 1) * (b + 1)
```



#### 逻辑关系表达式(短路原则)

* |
  如果第一个参数非空且非0，则返回第一个参数的值，否则返回第二个参数的值，但要求第二个参数的值也是非空或非0，否则返回0。如果第一个参数是非空或非0时，不会计算第二个参数。
* &
  如果两个参数都非空且非0，则返回第一个参数，否则返回0。如果第一个参为0或为空，则不会计算第二个参数。
* < <= = == != >= >
  比较两端的参数，如果为true，则返回1，否则返回0。**”==”是”=”的同义词**。”expr”首先尝试将**两端参数转换为整数，并做算术比较，如果转换失败，则按字符集排序规则做字符比较**。
* () 可以改变优先级，但需要用反斜杠转义

```shell
a=3
b=4

echo `expr $a \> $b`  # 输出0，>需要转义
echo `expr $a '<' $b`  # 输出1，也可以将特殊字符用引号引起来
echo `expr $a '>=' $b`  # 输出0
echo `expr $a \<\= $b`  # 输出1

c=0
d=5

echo `expr $c \& $d`  # 输出0
echo `expr $a \& $b`  # 输出3
echo `expr $c \| $d`  # 输出5
echo `expr $a \| $b`  # 输出3
```



### read命令

read命令用于从标准输入中读取单行数据。当读到文件结束符时，exit code为1，否则为0。

参数说明

```
-p: 后面可以接提示信息
-t：后面跟秒数，定义输入字符的等待时间，超过等待时间后会自动忽略此命令
```

```shell
acs@9e0ebfcd82d7:~$ read name  # 读入name的值
coconut # 标准输入
acs@9e0ebfcd82d7:~$ echo $name  # 输出name的值
coconut  #标准输出
acs@9e0ebfcd82d7:~$ read -p "Please input your name: " -t 30 name  # 读入name的值，等待时间30秒
Please input your name: coconut  # 标准输入
acs@9e0ebfcd82d7:~$ echo $name  # 输出name的值
coconut  # 标准输出
```



### echo命令

用于输出字符串

命令格式：

```shell
echo STRING
```

显示普通字符串

```shell
echo "Hello  Terminal"
echo Hello  Terminal  # 引号可以省略
```

显示转义字符(注意只能使用双引号，如果使用**单引号，则不转义**)

```shell
echo "\"Hello  Terminal\""  # 注意只能使用双引号，如果使用单引号，则不转义
echo \"Hello  Terminal\"  # 也可以省略双引号
```

显示变量

```shell
name=coconut
echo "My name is $name"  # 输出 My name is coconut
```

显示换行

```shell
echo -e "Hi\n"  # -e 开启转义
echo "coconut"

#输出结果
Hi

coconut
```

显示不换行

```shell
echo -e "Hi \c" # -e 开启转义 \c 不换行
echo "coconut"

#输出结果
Hi coconut
```

显示结果定向至文件

```shell
echo "Hello World" > output.txt  # 将内容以覆盖的方式输出到output.txt中
```

原样输出字符串，不进行转义或取变量(用单引号)

```shell
name=coconut
echo '$name\"'

#输出结果
$name\"
```

显示命令的执行结果

```shell
echo `date`  # 或者 echo $(date)

#输出结果
Wed Sep 1 11:45:33 CST 2021
```



### printf命令

printf命令用于格式化输出，类似于C/C++中的printf函数。

默认不会在字符串末尾添加换行符。

命令格式：

```bash
printf format-string [arguments...]
```

用法示例:

```shell
printf "%10d.\n" 123  # 占10位，右对齐
printf "%-10.2f.\n" 123.123321  # 占10位，保留2位小数，左对齐
printf "My name is %s\n" "coco"  # 格式化输出字符串
printf "%d * %d = %d\n"  2 3 `expr 2 \* 3` # 表达式的值作为参数

#输出结果
       123.
123.12    .
My name is coco
2 * 3 = 6
```



### test命令与判断符号[]

逻辑运算符&&和|| 

* && 表示与，|| 表示或
* 二者具有**短路原则**：
  expr1 && expr2：当expr1为假时，直接忽略expr2
  expr1 || expr2：当expr1为真时，直接忽略expr2
* 表达式的exit code为**0，表示真；为非零，表示假**。（**与C/C++中的定义相反**）



#### test命令

在命令行中输入man test，可以查看test命令的用法。

test命令用于判断文件类型，以及对变量做比较。

test命令用exit code返回结果，而不是使用stdout。**0表示真，非0表示假**。

```shell
test 2 -lt 3  # 为真，返回值为0
echo $?  # 输出上个命令的返回值，输出0

```

&& || 短路实现 if - else

```shell
acs@9e0ebfcd82d7:~$ ls  # 列出当前目录下的所有文件
homework  output.txt  test.sh  tmp
acs@9e0ebfcd82d7:~$ test -e test.sh && echo "exist" || echo "Not exist"
exist  # test.sh 文件存在
acs@9e0ebfcd82d7:~$ test -e test2.sh && echo "exist" || echo "Not exist"
Not exist  # testh2.sh 文件不存在
```



文件类型判断

```shell
test -e filename  # 判断文件是否存在
```

```
-e	文件是否存在
-f	是否为文件
-d	是否为目录
```

文件权限判断

```shell
test -r filename  # 判断文件是否可读
```

```
-r	文件是否可读
-w	文件是否可写
-x	文件是否可执行
```

整数间的比较

```shell
test $a -eq $b  # a是否等于b
```

```
-eq	a是否等于b
-ne	a是否不等于b
-gt	a是否大于b
-lt	a是否小于b
-ge	a是否大于等于b
-le	a是否小于等于b

-eq ：equal（相等）
-ne ：not equal（不等）
-gt ：greater than（大于）
-ge ：greater than or equal（大于或等于）
-lt ：less than（小于）
-le ：less than or equal（小于或等于）
注意：在shell中这些符号只能用于整数的比较，不能用于字符串。
```

字符串比较

```shell
test -z STRING	判断STRING是否为空，如果为空，则返回true
test -n STRING	判断STRING是否非空，如果非空，则返回true（-n可以省略）
test str1 == str2	判断str1是否等于str2
test str1 != str2	判断str1是否不等于str2
```

多重条件判定

```shell
test -r filename -a -x filename
```

```
-a	两条件是否同时成立
-o	两条件是否至少一个成立
!	取反。如 test ! -x file，当file不可执行时，返回true
```



#### 判断符号[]

[]与test用法几乎一模一样，更常用于if语句中。另外[[]]是[]的加强版，支持的特性更多。

```shell
[ 2 -lt 3 ]  # 为真，返回值为0
echo $?  # 输出上个命令的返回值，输出0
```

```shell
acs@9e0ebfcd82d7:~$ ls  # 列出当前目录下的所有文件
homework  output.txt  test.sh  tmp
acs@9e0ebfcd82d7:~$ [ -e test.sh ] && echo "exist" || echo "Not exist"
exist  # test.sh 文件存在
acs@9e0ebfcd82d7:~$ [ -e test2.sh ] && echo "exist" || echo "Not exist"
Not exist  # testh2.sh 文件不存在
```

注意：

* []内的每一项都要用空格隔开
* 中括号内的变量，最好用双引号括起来
* 中括号内的常数，最好用单或双引号括起来

e.g.

```shell
name="coco nut"
[ $name == "coco nut" ]  # 错误，等价于 [ coco nut == "coco nut" ]，参数太多(too many arguements)
[ "$name" == "coco nut" ]  # 正确

# [ is a shell builtin
```



### 判断语句

if…then形式
类似于C/C++中的if-else语句。

单层if
命令格式：

```shell
if condition #(判断的是condition退出状态exit code)
then
    语句1
    语句2
    ...
fi


# e.g.
a=3
b=4

if [ "$a" -lt "$b" ] && [ "$a" -gt 2 ]
then
    echo ${a}在范围内
fi

#输出结果
3在范围内
```



单层if-else
命令格式

```shell
if condition
then
    语句1
    语句2
    ...
else
    语句1
    语句2
    ...
fi


# e.g.
a=3
b=4

if ! [ "$a" -lt "$b" ]
then
    echo ${a}不小于${b}
else
    echo ${a}小于${b}
fi

# 输出结果
3小于4
```



多层if-elif-elif-else

```shell
if condition
then
    语句1
    语句2
    ...
elif condition
then
    语句1
    语句2
    ...
elif condition
then
    语句1
    语句2
else
    语句1
    语句2
    ...
fi



# e.g.

a=4

if [ $a -eq 1 ]
then
    echo ${a}等于1
elif [ $a -eq 2 ]
then
    echo ${a}等于2
elif [ $a -eq 3 ]
then
    echo ${a}等于3
else
    echo 其他
fi

# 输出结果
其他
```



case…esac形式

类似于C/C++中的switch语句。

```shell
case $变量名称 in
    值1)
        语句1
        语句2
        ...
        ;;  # 类似于C/C++中的break
    值2)
        语句1
        语句2
        ...
        ;;
    *)  # 类似于C/C++中的default
        语句1
        语句2
        ...
        ;;
esac

# e.g.

a=4

case $a in
    1)
        echo ${a}等于1
        ;;  
    2)
        echo ${a}等于2
        ;;  
    3)                                                
        echo ${a}等于3
        ;;  
    *)
        echo 其他
        ;;  
esac

# 输出结果
其他
```



### 循环语句

```shell
for…in…do…done  #类似Python
```

```shell
for var in val1 val2 val3
do
    语句1
    语句2
    ...
done

# e.g.(1) 输出a 2 cc，每个元素一行：
for i in a 2 cc
do
    echo $i
done

# e.g. (2) 输出当前路径下的所有文件名，每个文件名一行
for file in `ls`
do
    echo $file
done

# e.g. (3) 输出1-10
for i in $(seq 1 10)
do
    echo $i
done

# e.g. (4) 范围遍历使用{1..10} 或者 {a..z} (反过来也可以)
for i in {a..z}
do
    echo $i
done


```





```shell
for ((…;…;…)) do…done   #类似C
```

```shell
for ((expression; condition; expression))
do
    语句1
    语句2
done

# e.g.
for ((i=1; i<=10; i++))
do
    echo $i
done
```





```shell
while…do…done循环
```

```shell
while condition
do
    语句1
    语句2
    ...
done

# e.g. 示例，文件结束符为Ctrl+d，输入文件结束符后read指令返回false。 `read` 当读到文件结束符时，exit code为1，否则为0
while read name
do
    echo $name
done
```



```shell
until…do…done循环  # 当条件为真时结束。
```

```shell
until condition
do
    语句1
    语句2
    ...
done

# e.g. 当用户输入yes或者YES时结束，否则一直等待读入。
until [ "${word}" == "yes" ] || [ "${word}" == "YES" ]
do
    read -p "Please input yes/YES to stop this program: " word
done
```





break命令

跳出当前**一层**循环，注意与C/C++不同的是：**break不能跳出case语句**。

```shell
while read name
do
    for ((i=1;i<=10;i++))
    do
        case $i in
            8)
                break
                ;;
            *)
                echo $i
                ;;
        esac
    done
done

#该示例每读入非EOF的字符串，会输出一遍1-7。
#该程序可以输入Ctrl+d文件结束符来结束，也可以直接用Ctrl+c杀掉该进程。
```



continue命令

跳出当前循环。

```shell
for ((i=1;i<=10;i++))
do
    if [ `expr $i % 2` -eq 0 ]
    then
        continue
    fi
    echo $i
done

#该程序输出1-10中的所有奇数。
```



死循环的处理方式
```
如果Terminal可以打开该程序，则输入Ctrl+c即可。

否则可以直接关闭进程：

使用top命令找到进程的PID
输入kill -9 PID即可关掉此进程
```





### 函数

bash中的函数类似于C/C++中的函数，但return的返回值与C/C++不同，返回的是exit code，取值为0-255，0表示正常结束。

如果想获取函数的输出结果，可以通过echo输出到stdout中，然后通过$(function_name)来获取stdout中的结果。

函数的return值可以通过$?来获取。



命令格式

```shell
[function] func_name() {  # function关键字可以省略
    语句1
    语句2
    ...
}
```

```shell
func() {
    name=coconut
    echo "Hello $name"
}

func


#output: Hello coconut
```

```shell
func() {
    name=coconut
    echo "Hello $name"

    return 123
}

output=$(func)
ret=$?

echo "output = $output"
echo "return = $ret"

# 输出结果：
# output = Hello coconut
# return = 123
```

函数的输入参数

在函数内，`dollar`1表示第一个输入参数，`dollar`2表示第二个输入参数，依此类推。

注意：函数内的$0仍然是文件名，而不是函数名。

```shell
func() {  # 递归计算 $1 + ($1 - 1) + ($1 - 2) + ... + 0
    word=""
    while [ "${word}" != 'y' ] && [ "${word}" != 'n' ]
    do
        read -p "要进入func($1)函数吗？请输入y/n：" word
    done

    if [ "$word" == 'n' ]
    then
        echo 0
        return 0
    fi  

    if [ $1 -le 0 ] 
    then
        echo 0
        return 0
    fi  

    sum=$(func $(expr $1 - 1))
    echo $(expr $sum + $1)
}

echo $(func 10)


# 输出结果： 55
```



函数内的局部变量

可以在函数内定义局部变量，作用范围仅在当前函数内。

可以在递归函数中定义局部变量。

命令格式：

```
local 变量名=变量值
```

```shell
#! /bin/bash

func() {
    local name=coco
    echo $name
}
func

echo $name


# 输出结果
# Line1: coco
# Line2: (null)

# 第一行为函数内的name变量，第二行为函数外调用name变量，会发现此时该变量不存在。
```



### exit命令

exit命令用来退出当前shell进程，并返回一个退出状态；使用$?可以接收这个退出状态。

exit命令可以接受一个整数值作为参数，代表退出状态。如果不指定，默认状态值是 0。

exit退出状态只能是一个介于 0~255 之间的整数，其中只有 0 表示成功，其它值都表示失败。

E.g.

```shell
#! /bin/bash

if [ $# -ne 1 ]  # 如果传入参数个数等于1，则正常退出；否则非正常退出。
then
    echo "arguments not valid"
    exit 1
else
    echo "arguments valid"
    exit 0
fi
```

```shell
acs@9e0ebfcd82d7:~$ chmod +x test.sh 
acs@9e0ebfcd82d7:~$ ./test.sh coconut
arguments valid
acs@9e0ebfcd82d7:~$ echo $?  # 传入一个参数，则正常退出，exit code为0
0
acs@9e0ebfcd82d7:~$ ./test.sh 
arguments not valid
acs@9e0ebfcd82d7:~$ echo $?  # 传入参数个数不是1，则非正常退出，exit code为1
1
```



### 文件重定向

每个进程默认打开3个文件描述符：

* stdin标准输入，从命令行读取数据，文件描述符为0
* stdout标准输出，向命令行输出数据，文件描述符为1
* stderr标准错误输出，向命令行输出数据，文件描述符为2
  * 可以用文件重定向将这三个文件重定向到其他文件中。



重定向命令列表

```shell
command > file	    将stdout重定向到file中(覆盖)
command < file	    将stdin重定向到file中
command >> file  	将stdout以追加方式重定向到file中
command n> file 	将文件描述符n重定向到file中
command n>> file	将文件描述符n以追加方式重定向到file中
```

输入和输出重定向

```shell
echo -e "Hello \c" > output.txt  # 将stdout重定向到output.txt中
echo "World" >> output.txt  # 将字符串追加到output.txt中

read str < output.txt  # 从output.txt中读取字符串

echo $str  # 输出结果：Hello World
```



同时重定向stdin和stdout

创建bash脚本：

```shell
#! /bin/bash

read a
read b

echo $(expr "$a" + "$b")
```

创建input.txt，里面的内容为：

3
4

执行命令：

```shell
acs@9e0ebfcd82d7:~$ chmod +x test.sh  # 添加可执行权限
acs@9e0ebfcd82d7:~$ ./test.sh < input.txt > output.txt  # 从input.txt中读取内容，将输出写入output.txt中
acs@9e0ebfcd82d7:~$ cat output.txt  # 查看output.txt中的内容
7
```



### 引入外部脚本

类似于C/C++中的include操作，bash也可以引入其他文件中的代码。

语法格式：

```shell
. filename  # 注意点和文件名之间有一个空格

或

source filename
```

示例：

创建test1.sh，内容为：

```shell
#! /bin/bash

name=coconut  # 定义变量name
```

然后创建test2.sh，内容为：

```shell
#! /bin/bash

source test1.sh # 或 . test1.sh

echo My name is: $name  # 可以使用test1.sh中的变量
```

执行及结果：

```shell
acs@9e0ebfcd82d7:~$ chmod +x test2.sh 
acs@9e0ebfcd82d7:~$ ./test2.sh 
My name is: coconut
```





## 其它

* `readlink -f` 是一个用于解析符号链接（symlink）并显示其实际目标路径的命令。符号链接是指向其他文件或目录的特殊文件。`readlink` 命令的 `-f` 选项用于显示符号链接所指向的最终绝对路径，处理了所有的符号链接，直至实际的文件系统路径

```shell
readlink -f <symlink>
```

**用途**

- **检查符号链接目标**: 确定符号链接所指向的实际文件或目录，特别是在调试文件路径或验证链接时。
- **验证路径**: 将相对路径转换为绝对路径，以便于脚本和命令的路径处理。
- **安全检查**: 在安全检查中，使用 `readlink -f` 确认文件的真实位置，防止潜在的安全漏洞。



------

------



## SSH

### SSH登录

#### 基本用法

远程登录服务器：

```shell
ssh user@hostname
```

user: 用户名
hostname: IP地址或域名

第一次登录时会提示：

```shell
The authenticity of host '123.57.47.211 (123.57.47.211)' can't be established.
ECDSA key fingerprint is SHA256:iy237yysfCe013/l+kpDGfEG9xxHxm0dnxnAbJTPpG8.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

输入yes，然后回车即可。
这样会将该服务器的信息记录在~/.ssh/known_hosts文件中。

然后输入密码即可登录到远程服务器中。



默认登录端口号为22。如果想登录某一特定端口：

```shell
ssh user@hostname -p 22
```



#### 配置文件

创建文件 ~/.ssh/config。

然后在文件中输入：

```shell
Host myserver1
    HostName IP地址或域名
    User 用户名

Host myserver2
    HostName IP地址或域名
    User 用户名
```

之后再使用服务器时，可以直接使用别名myserver1、myserver2。



#### 密钥登录

创建密钥：

```shell
ssh-keygen
```

然后一直回车即可。

执行结束后，~/.ssh/目录下会多两个文件：

id_rsa：私钥
id_rsa.pub：公钥

之后想免密码登录哪个服务器，就将公钥传给哪个服务器即可。

例如，想免密登录myserver服务器。则将公钥中的内容，复制到myserver中的~/.ssh/authorized_keys文件里即可。

也可以使用如下命令**一键添加公钥**：

```shell
ssh-copy-id myserver
```



#### 执行命令

命令格式：

```shell
ssh user@hostname command

# e.g. (1)
ssh user@hostname ls -a

# e.g. (2)
# 单引号中的$i可以求值
ssh myserver 'for ((i = 0; i < 10; i ++ )) do echo $i; done'
# 双引号中的$i不可以求值
ssh myserver "for ((i = 0; i < 10; i ++ )) do echo $i; done"
```



### SCP传文件

#### 基本用法

命令格式：

```shell
scp source destination
```

将source路径下的文件复制到destination中



一次复制多个文件：

```shell
scp source1 source2 destination
```



复制文件夹：

```shell
scp -r ~/tmp myserver:/home/acs/
# 将本地家目录中的tmp文件夹复制到myserver服务器中的/home/acs/目录下。

scp -r ~/tmp myserver:homework/
# 将本地家目录中的tmp文件夹复制到myserver服务器中的~/homework/目录下。

scp -r myserver:homework .
# 将myserver服务器中的~/homework/文件夹复制到本地的当前路径下。
```



指定服务器的端口号：

```shell
scp -P 22 source1 source2 destination
```

注意： scp的-r -P等参数尽量加在source和destination之前。



#### 配置其他服务器的vim和tmux

```shell
scp ~/.vimrc ~/.tmux.conf myserver:
```



## 验证git

```shell
ssh -T git@github.com
```



------

------



## Git

一个推荐的学习平台 （[Learn Git Branching](https://learngitbranching.js.org/?locale=zh_CN)）https://learngitbranching.js.org/?locale=zh_CN

[#超详细# linux下 使用 Git 将代码上传到指定分支_linux git 上传到一个分支-CSDN博客](https://blog.csdn.net/lch551218/article/details/104645032)

------



### git基本概念

工作区：仓库的目录。工作区是独立于各个分支的。
暂存区：数据暂时存放的区域，类似于工作区写入版本库前的缓存区。暂存区是独立于各个分支的。
版本库：存放所有已经提交到本地仓库的代码版本
版本结构：树结构，树中每个节点代表一个代码版本。





### git常用命令

本地操作

```shell
git config --global user.name xxx：设置全局用户名，信息记录在~/.gitconfig文件中
git config --global user.email xxx@xxx.com：设置全局邮箱地址，信息记录在~/.gitconfig文件中
git init：将当前目录配置成git仓库，信息记录在隐藏的.git文件夹中
git add XX：将XX文件添加到暂存区
git add .：将所有待加入暂存区的文件加入暂存区
git rm --cached XX：将文件从仓库索引目录中删掉
git commit -m "给自己看的备注信息"：将暂存区的内容提交到当前分支
git status：查看仓库状态
git diff XX：查看XX文件相对于暂存区修改了哪些内容
git log：查看当前分支的所有版本
git reflog：查看HEAD指针的移动历史（包括被回滚的版本）
git reset --hard HEAD^ 或 git reset --hard HEAD~：将代码库回滚到上一个版本
git reset --hard HEAD^^：往上回滚两次，以此类推
git reset --hard HEAD~100：往上回滚100个版本
git reset --hard 版本号：回滚到某一特定版本 （SHA256 前7位）
git checkout — XX或git restore XX：将XX文件尚未加入暂存区的修改全部撤销
```

分支操作

```shell
git checkout — XX或git restore XX：将XX文件尚未加入暂存区的修改全部撤销
git remote add origin git@git.acwing.com:xxx/XXX.git：将本地仓库关联到远程仓库
git push -u (第一次需要-u以后不需要)：将当前分支推送到远程仓库
git push origin branch_name：将本地的某个分支推送到远程仓库
git clone git@git.acwing.com:xxx/XXX.git：将远程仓库XXX下载到当前目录下
```

云端操作

```shell
git checkout -b branch_name：创建并切换到branch_name这个分支
git branch：查看所有分支和当前所处分支
git checkout branch_name：切换到branch_name这个分支
git merge branch_name：将分支branch_name合并到当前分支上
git branch -d branch_name：删除本地仓库的branch_name分支
git branch branch_name：创建新分支
git push --set-upstream origin branch_name：设置本地的branch_name分支对应远程仓库的branch_name分支
git push -d origin branch_name：删除远程仓库的branch_name分支
git pull：将远程仓库的当前分支与本地仓库的当前分支合并
git pull origin branch_name：将远程仓库的branch_name分支与本地仓库的当前分支合并
git branch --set-upstream-to=origin/branch_name1 branch_name2：将远程的branch_name1分支与本地的branch_name2分支对应
git checkout -t origin/branch_name 将远程的branch_name分支拉取到本地

```

栈

```shell
git stash：将工作区和暂存区中尚未提交的修改存入栈中
git stash apply：将栈顶存储的修改恢复到当前分支，但不删除栈顶元素
git stash drop：删除栈顶存储的修改
git stash pop：将栈顶存储的修改恢复到当前分支，同时删除栈顶元素
git stash list：查看栈中所有元素
```

