# 命令行传递参数

```python
parser = argparse.ArgumentParser(description='Count continuous accesses in an address list from a file.')
parser.add_argument('in_file', type=str, help='input file containing addresses')
parser.add_argument('out_file', type=str, help='output file to write results')

args = parser.parse_args()
in_file = args.in_file
out_file = args.out_file
```

```shell
python script.py /path/to/input_file /path/to/output_file
```



# 清洗数据S1

`tick + ' ' + operator + ' ' + address + ' ' + str_content + ' 0 \n'`

```python
import os
import sys
import re

in_file = os.path.basename('505.mcf_r/mcf_r.out')
out_file = os.path.basename('tran_result/result_mcf')


def gem5_out_to_nvt(gem5_file_path, nvt_file_path):
    nvt_file = open(nvt_file_path, 'w')
    with open(gem5_file_path, 'r') as f_t:
        while True:
            line = f_t.readline()
            if not line:
                break
            if 'size 64' in line:
                address = re.findall(r"address (.+?) C", line)[0]
                tick = re.findall(r"[0-9]*:", line)[0][:-1]
                operator = re.findall(r"global: (.+?) from", line)[0]

                str_content = ''
                for lines in range(4):
                    line = f_t.readline().strip('\n')
                    q = line.find('global')
                    str_content = str_content + line[q + 18:q + 66].replace(' ', '')
                if operator == 'Write':
                    operator = 'W'
                    pre_data = tick + ' ' + operator + ' ' + address + ' ' + str_content + ' 0 \n'
                    nvt_file.write(pre_data)
                elif operator == 'Read':
                    operator = 'R'
                    pre_data = tick + ' ' + operator + ' ' + address + ' ' + str_content + '\n'
                    nvt_file.write(pre_data)
    nvt_file.close()

gem5_out_to_nvt(in_file,out_file)
```



代码相对命令行作修改

```python
import os
import sys
import re
import argparse

def gem5_out_to_nvt(gem5_file_path, nvt_file_path):
    nvt_file = open(nvt_file_path, 'w')
    with open(gem5_file_path, 'r') as f_t:
        while True:
            line = f_t.readline()
            if not line:
                break
            if 'size 64' in line:
                address = re.findall(r"address (.+?) C", line)[0]
                tick = re.findall(r"[0-9]*:", line)[0][:-1]
                operator = re.findall(r"global: (.+?) from", line)[0]

                str_content = ''
                for lines in range(4):
                    line = f_t.readline().strip('\n')
                    q = line.find('global')
                    str_content = str_content + line[q + 18:q + 66].replace(' ', '')
                if operator == 'Write':
                    operator = 'W'
                    pre_data = tick + ' ' + operator + ' ' + address + ' ' + str_content + ' 0 \n'
                    nvt_file.write(pre_data)
                elif operator == 'Read':
                    operator = 'R'
                    pre_data = tick + ' ' + operator + ' ' + address + ' ' + str_content + '\n'
                    nvt_file.write(pre_data)
    nvt_file.close()

    
parser = argparse.ArgumentParser(description='Count continuous accesses in an address list from a file.')
parser.add_argument('in_file', type=str, help='input file containing addresses')
parser.add_argument('out_file', type=str, help='output file to write results')

args = parser.parse_args()
in_file = args.in_file
out_file = args.out_file
gem5_out_to_nvt(in_file,out_file)
```

这里`\#!/usr/bin/env python3`也行

```shell
#!/bin/bash
python3 s1.py 505.mcf_r/505.mcf_r.out 505.mcf_r/mcf_r
```



# 清洗数据S1->S2

`tick + ' ' + operator + ' ' + address+ '\n'`

```python
import os
import sys
import re

in_file = os.path.basename('/home/dell/jhlu/trace/result_mcf')
out_file = os.path.basename('/home/dell/jhlu/trace/result_mcf_cut')


def gem5_out_to_nvt(gem5_file_path, nvt_file_path):
    nvt_file = open(nvt_file_path, 'w')
    with open(gem5_file_path, 'r') as f_t:
        while True:
            line = f_t.readline()
            if not line:
                break
            str_list = line.split(' ')
            tick = str_list[0]
            op = str_list[1]
            addr = str_list[2]
            pre_data = tick + ' ' + op + ' ' + addr + '\n'       
            nvt_file.write(pre_data)
    nvt_file.close()

gem5_out_to_nvt(in_file,out_file)
```

```python
import os
import sys
import re
import argparse

def gem5_out_to_nvt(gem5_file_path, nvt_file_path):
    nvt_file = open(nvt_file_path, 'w')
    with open(gem5_file_path, 'r') as f_t:
        while True:
            line = f_t.readline()
            if not line:
                break
            str_list = line.split(' ')
            tick = str_list[0]
            op = str_list[1]
            addr = str_list[2]
            pre_data = tick + ' ' + op + ' ' + addr + '\n'       
            nvt_file.write(pre_data)
    nvt_file.close()

parser = argparse.ArgumentParser(description='Count continuous accesses in an address list from a file.')
parser.add_argument('in_file', type=str, help='input file containing addresses')
parser.add_argument('out_file', type=str, help='output file to write results')

args = parser.parse_args()
in_file = args.in_file
out_file = args.out_file

gem5_out_to_nvt(in_file,out_file)
```

```shell
#!/bin/bash
python3 s2.py 505.mcf_r/505.mcf_r 505.mcf_r/mcf_r_cut
```



# 提取地址序列S2->S3

```python
import os
import sys
import re

in_file = os.path.basename('538.imagick_r/imagick_r_cut')
out_file = os.path.basename('/home/dell/jhlu/gem5_hybrid2/trace_hybrid2/p_res/imagick_w')

# 判断连续
def close(addr1,addr2):
    flag = 0
    if addr2 == addr1 + 64:
        flag = 1
    return flag

def cal(in_f,out_f):
    get_f = open(out_f,'w')
    with open(in_f,'r') as f_t:
        print(in_f)
    # 定义地址序列
    addr_list = []
    # 逐行读取
    while True:
        line = f_t.readline()
        if not line:
            break
        str_list = line.split(' ')
        tick = str_list[0]
        # 过滤0时刻
        while tick == 0:
            line = f_t.readline()
            if not line:
                break
            str_list = line.split(' ')
            tick = str_list[0]
        # 按需得到数据
        tick = str_list[0]
        op = str_list[1]
        addr = str_list[2]
        # 区分读写,可修改
        if op == 'W':
            addr_list.append(int(addr))
```







# 判断连续次数

F1：ChatGPT给的

```python
def count_continuous_accesses(addr_list):
    if not addr_list:
        return {}

    continuous_lengths = []
    current_length = 1

    for i in range(1, len(addr_list)):
        if close(addr_list[i - 1], addr_list[i]):
            current_length += 1
        else:
            continuous_lengths.append(current_length)
            current_length = 1

    continuous_lengths.append(current_length)  # 最后一段连续访问的长度

    # 统计每个连续长度出现的次数
    length_counts = dict()
    for length in continuous_lengths:
        if length in length_counts:
            length_counts[length] += 1
        else:
            length_counts[length] = 1

    return length_counts
```

F2：我实现的双指针

```PYTHON
def count_continuous_accesses(addr_list):
    len_addr = len(addr_list)
    i = 0
    j = 0
    mapped = dict()

    while i < len_addr - 1 and j < len_addr - 1:
        while j < len_addr - 1 and close(addr_list[j], addr_list[j + 1]):  # j指针停在从连续到不连续的地方
            j += 1
        if (j - i + 1) >= 2:  # 连续距离为 j-i+1
            length = j - i + 1
            if length in mapped:
                mapped[length] += 1  # 存入哈希表 K是连续长度 V是出现次数
            else:
                mapped[length] = 1
        j += 1
        i = j

    return mapped
```







```python
import os
import sys
import re
import argparse

# 判断连续
def close(addr1,addr2):
    flag = 0
    if addr2 == addr1 + 64:
        flag = 1
    return flag

def cal(in_f,out_f):
    get_f = open(out_f,'w')
    with open(in_f,'r') as f_t:
        print(in_f)
    # 定义地址序列
    addr_list = []
    # 逐行读取
    while True:
        line = f_t.readline()
        if not line:
            break
        str_list = line.split(' ')
        tick = str_list[0]
        # 过滤0时刻
        while tick == 0:
            line = f_t.readline()
            if not line:
                break
            str_list = line.split(' ')
            tick = str_list[0]
        # 按需得到数据
        tick = str_list[0]
        op = str_list[1]
        addr = str_list[2]
        # 区分读写,可修改
        if op == 'W':
            addr_list.append(int(addr))
     return addr_list

def count_continuous_accesses(addr_list):
    len_addr = len(addr_list)
    i = 0
    j = 0
    mapped = dict()

    while i < len_addr - 1 and j < len_addr - 1:
        while j < len_addr - 1 and close(addr_list[j], addr_list[j + 1]):  # j指针停在从连续到不连续的地方
            j += 1
        if (j - i + 1) >= 2:  # 连续距离为 j-i+1
            length = j - i + 1
            if length in mapped:
                mapped[length] += 1  # 存入哈希表 K是连续长度 V是出现次数
            else:
                mapped[length] = 1
        j += 1
        i = j

    return mapped

parser = argparse.ArgumentParser(description='Count continuous accesses in an address list from a file.')
parser.add_argument('in_file', type=str, help='input file containing addresses')
parser.add_argument('out_file', type=str, help='output file to write results')

args = parser.parse_args()
in_file = args.in_file
out_file = args.out_file

addr_list = cal(in_file,out_file)
len_addr= len(addr_list)
kv_map = count_continuous_accesses(addr_list)
get_f = open(out_file,'w')
for k,v in kv_map:
    times = float((v/len_addr),5)
    f_str = "连续访问 "+str(k)+" 个地址，在本次Trace中，共计出现 "+str(v)+" 次。"+"\n"+"这段连续访问序列占总访问序列的长度之比为 "+str(times)+" \n\n"
    get_f.write(f_str)
get_f.close()
```

```shell
#!/bin/bash
python3 s3.py 505.mcf_r/505.mcf_r_cut 505.mcf_r/mcf_kvmap
```



所以最终脚本

```bash
#!/bin/bash
# 定义包含多个元素的列表
# 获取当前脚本所在的目录路径
current_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# 进入脚本所在的目录
cd "$current_dir"
# 初始化一个空数组来存储目录名，命名为elements
elements=()
# 使用find命令查找所有以"_r"结尾的目录，并将结果存入数组
while IFS= read -r -d '' dir; do
    elements+=("$dir")
done < <(find . -maxdepth 1 -type d -name '*_r' -print0)

# 打印数组中的目录名，也可以进一步处理这些目录
printf '%s\n' "${elements[@]}"
# 遍历列表中的每个元素
for element in "${elements[@]}"; do
    echo "Processing $element"
    # 提取数字和_r夹住的部分
    base_name=$(echo "$element" | sed -E 's/[0-9]+\.([a-zA-Z]+)_r/\1/')
    # 构造路径并执行脚本，传递相应的参数
    python3 s1.py "$element/$element.out" "$element/${base_name}_r"
    python3 s2.py "$element/${base_name}_r" "$element/${base_name}_cut"
    python3 s3.py "$element/${base_name}_cut" "$element/${base_name}_kvmap"
done
```



