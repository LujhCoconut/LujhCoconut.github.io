# LeetCode刷题笔记

## 1.两数之和

[1. 两数之和 - 力扣（LeetCode）](https://leetcode.cn/problems/two-sum/description/)

解法：哈希表

```c++
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int,int> heap; //定义哈希表，值映射下标
        for(int i=0;i<nums.size();i++){
            int r = target -nums[i]; // 期望在哈希表里搜索的值
            if(heap.count(r))return {heap[r],i}; //有值即找到目标 返回该值对应的下标和当前下标
            heap[nums[i]] = i;
        }
        return {};
    }
};
```



## 2.两数相加

[2. 两数相加 - 力扣（LeetCode）](https://leetcode.cn/problems/add-two-numbers/description/)

解法：哑结点处理 + 小学数学进位

```c++
/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        auto dummy = new ListNode(-1) , cur = dummy; //避免特判头结点是否为空等等复杂情况
        int t = 0; //用于判断是否进位的变量 存储每次个位数和进位数之和  
        while(l1 || l2 || t){ 
            if(l1) t += l1->val , l1=l1->next;
            if(l2) t += l2->val , l2=l2->next;
            cur->next = new ListNode(t%10); //当前为是余数
            cur = cur->next;
            t  /= 10; //用于进位 只有0，1两种情况
        }
        return dummy->next;//哑结点之后才是头结点
    }
};
```



## 3.无重复字符的最长子串

[3. 无重复字符的最长子串](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)

解法：双指针

```c++
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_map<char,int> hash; //定义一个数组标记每个元素的访问次数，出现2次则以为则重复
        for(auto c : s)hash[c]=0;//初始默认全为0次
        int len = 0;
        for(int i=0,j=0;j<s.size();j++){
            hash[s[j]]++;//右指针向后移动，标记访问
            if(hash[s[j]] == 2)//次数出现2，则j对应的元素重复出现
            {
                len = max(len,j-i);//更新最大长度为j-i
                while(i<j){//移动左指针直到迈过重复元素，同时清理重复元素之前的访问次数
                    hash[s[i]]--;
                    i++;
                    if(hash[s[j]]==1)break;
                }
            }else len = max(len,j-i+1);//没重复时，依然更新最大长度为j-i+1
        }
        return len;
    }
};
```

更优美的写法,原理与上面几乎完全相同。区别在于第一种是右指针会区分停下来和不停下来计算不重复序列长度，第二种则是直接将左指针移动到不重复的位置开始。

```c++
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
       unordered_map<char,int> heap;
       int res=0;
       for(int i=0,j=0;j<s.size();j++){
        heap[s[j]]++;
        while(heap[s[j]]>1)heap[s[i++]]--;
        res = max(res,j-i+1);
       }
       return res;
    }
};
```

