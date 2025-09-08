## P1843

```C++
#include <iostream>
#include <cstring>
#include <algorithm>
using namespace std;

const int N = 500010;
int w[N];
int n,a,b;


int main(){
    scanf("%d%d%d",&n,&a,&b);
    for(int i=1;i<=n;i++)
        scanf("%d",&w[i]);

    sort(w+1,w+n+1,greater<int>());

    int hot = a+b;
    int step = 0;
    
    for(int j=1;j<=n;j++){
        w[j] = w[j] - step*a;
        if(w[j] <= 0)break;
        if(w[j]%hot != 0)
            step += w[j]/hot + 1;
        else
            step += w[j]/hot;
    }
    printf("%d\n",step);
    return 0;
}
```

* 3AC, 6WA, 33分

> 复盘原因：不够贪，我是每次直接把最大的晒完，忽略了晒一次再放进去一次；因为晒一次，就有可能有别的比他湿的了。



