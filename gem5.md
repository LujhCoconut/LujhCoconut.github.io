# gem5

## gem5的代理对象软件设计模式

* 在软件设计中，代理对象是一种设计模式，用于控制对目标对象的访问、修改行为或提供其他功能。在gem5中，代理对象用于对系统中对象的参数进行抽象处理

`proxy.py` in `gem5/src/python/m5`

### class `BaseProxy`

```python
class BaseProxy:
    def __init__(self, search_self, search_up):
        self._search_self = search_self
        self._search_up = search_up
        self._ops = []
```

**`__init__`方法**接受两个参数`search_self`和`search_up`，并将它们存储为实例属性`self._search_self`和`self._search_up`。这两个参数决定了代理对象在属性搜索时的行为：
`search_self`: 如果为`True`，代理对象将在当前对象中进行搜索。
`search_up`: 如果为`True`，代理对象将在父对象中进行搜索。
`self._ops`：这是一个列表，用于存储代理对象执行的操作。

```python
def __str__(self):
        if self._search_self and not self._search_up:
            s = "Self"
        elif not self._search_self and self._search_up:
            s = "Parent"
        else:
            s = "ConfusedProxy"
        return s + "." + self.path()
```

**字符串表示 `__str__`**
`__str__`方法返回`BaseProxy`对象的字符串表示。
根据`self._search_self`和`self._search_up`的值，返回相应的字符串：
如果`self._search_self`为`True`且`self._search_up`为`False`，返回`Self`。
如果`self._search_self为False`且`self._search_up`为`True`，返回`Parent`。
否则，返回`ConfusedProxy`。
然后将该字符串与`self.path()`的结果组合在一起返回。

```python
 def __setattr__(self, attr, value):
        if not attr.startswith("_"):
            raise AttributeError(
                f"cannot set attribute '{attr}' on proxy object"
            )
        super().__setattr__(attr, value)
```

**设置属性 `__setattr__`**
`__setattr__`方法用于设置`BaseProxy`对象的属性。它覆盖了Python的内置属性设置方法。
如果要设置的属性不以下划线`_`开头，则抛出`AttributeError`异常，因为代理对象不应该直接设置属性。
如果属性名以下划线开头，则调用父类的`__setattr__`方法进行设置。

```python
def _gen_op(operation):
        def op(self, operand):
            if not (isinstance(operand, (int, float)) or isproxy(operand)):
                raise TypeError(
                    "Proxy operand must be a constant or a proxy to a param"
                )
            self._ops.append((operation, operand))
            return self

        return op
```

**`_gen_op`是一个内部静态方法**，用于生成代理对象的操作方法（例如加法、减法等）。
它返回一个**闭包函数**，该函数接受一个`operation`参数（即要执行的操作，例如加法、减法等）。
这个闭包函数接受一个``operand``参数，并检查它是否是一个整数、浮点数或代理对象（通过isproxy函数检查）。
如果`operand`是合法的类型，则**将操作和操作数添加到self._ops列表中，并返回self**（即继续链式调用）。

> 闭包函数（closures）是一种函数，该函数在定义时记住了它的外部作用域（enclosing scope）的变量，并且可以在函数执行时访问这些变量。这意味着即使在函数的外部作用域已经退出的情况下，闭包函数仍然能够保留并访问这些变量。这种行为使得闭包函数成为一种强大的编程工具，因为它们可以封装状态和行为。
>
> **闭包函数的特点**
>
> - **定义在另一个函数内部**：闭包函数通常是在另一个函数内部定义的。
> - **保留外部作用域的变量**：闭包函数可以访问定义时外部作用域中的变量，即使外部函数已经退出。
> - **可作为返回值**：闭包函数通常可以作为外部函数的返回值，这样外部函数退出后，闭包函数仍然可以访问外部作用域中的变量。

```python
def _opcheck(self, result, base):
        from . import params

        for operation, operand in self._ops:
            # Get the operand's value
            if isproxy(operand):
                operand = operand.unproxy(base)
                # assert that we are operating with a compatible param
                if not isinstance(operand, params.NumericParamValue):
                    raise TypeError("Proxy operand must be a numerical param")
                operand = operand.getValue()

            # Apply the operation
            result = operation(result, operand)

        return result
```

**`_opcheck`方法**
这个方法接受两个参数：`result`和`base`。
它用于应用存储在代理对象中`self._ops`的所有操作。
首先，遍历`self._ops`中的每个操作：
如果操作数是另一个代理对象（通过`isproxy`函数检查），则对操作数进行解代理，得到实际值，并检查操作数是否是数值参数类型`params.NumericParamValue`。
使用当前的`result`和操作数应用该操作，并更新`result`。
返回最终的`result`。



```python
 def unproxy(self, base):
        obj = base
        done = False

        if self._search_self:
            result, done = self.find(obj)

        if self._search_up:
            # Search up the tree but mark ourself
            # as visited to avoid a self-reference
            self._visited = True
            obj._visited = True
            while not done:
                obj = obj._parent
                if not obj:
                    break
                result, done = self.find(obj)

            self._visited = False
            base._visited = False

        if not done:
            raise AttributeError(
                "Can't resolve proxy '%s' of type '%s' from '%s'"
                % (self.path(), self._pdesc.ptype_str, base.path())
            )

        if isinstance(result, BaseProxy):
            if result == self:
                raise RuntimeError("Cycle in unproxy")
            result = result.unproxy(obj)

        return self._opcheck(result, base)
```

**`unproxy`方法**
`unproxy`方法用于将代理对象转换为实际值。
它接受一个`base`参数（通常是开始搜索的对象），然后执行以下步骤：
首先，在当前对象中进行搜索。如果找到了结果，则设置标志`done`为`True`。
然后，如果`self._search_up`为`True`，在父对象中继续搜索，直到找到结果或遍历到树的根。
如果搜索完成且找到了结果，则对结果进行解代理（如果结果是一个代理对象）。
如果搜索未成功，抛出`AttributeError`异常。
如果结果是自身的代理，抛出`RuntimeError`，因为这意味着存在**循环解代理**。
最终返回解除代理后的结果，并调用`_opcheck`方法检查和应用所有操作。

```python
   def getindex(obj, index):
        if index == None:
            return obj
        try:
            obj = obj[index]
        except TypeError:
            if index != 0:
                raise
            # if index is 0 and item is not subscriptable, just
            # use item itself (so cpu[0] works on uniprocessors)
        return obj
```

这个静态方法接受两个参数：`obj`和`index`。

它用于通过下标索引访问对象，如果下标为`None`，则返回对象本身。

尝试通过下标索引访问对象，如果对象不可索引且下标不为`0`，则抛出异常；如果下标为`0`，则返回对象本身

```python
    def set_param_desc(self, pdesc):
        self._pdesc = pdesc
```

**`set_param_desc`方法**

- 这个方法接受一个参数`pdesc`。
- 它用于将参数描述(`pdesc`)分配给代理对象，以便在需要时对其进行检查和验证。



### class `AttrProxy`

`AttrProxy` 类是 `BaseProxy` 的一个子类，用于表示通过属性`attribute`引用的代理对象。这种代理对象通常是用于在访问系统中对象的属性时进行一些额外的处理和控制。在`AttrProxy`中，代理对象的行为可以通过定义`attr`属性来确定，并通过一些操作进行修饰。

```python
    def __init__(self, search_self, search_up, attr):
        super().__init__(search_self, search_up)
        self._attr = attr
        self._modifiers = []

```

**类的初始化 (`__init__`)**

- `__init__` 方法接受三个参数：`search_self`、`search_up`和`attr`。这三个参数分别确定了代理对象的搜索行为（在当前对象还是父对象中进行搜索）以及代理对象所表示的属性名。
- `self._attr` 存储了代理对象所表示的属性名。
- `self._modifiers` 是一个列表，用于存储后续的修饰操作（例如对属性进行索引或链式调用）。

```python
	def __getattr__(self, attr):
        # python uses __bases__ internally for inheritance
        if attr.startswith("_"):
            return super().__getattr__(self, attr)
        if hasattr(self, "_pdesc"):
            print("proxy attributrError = "+str(hasattr(self, "_pdesc")))
            raise AttributeError(
                "Attribute reference on bound proxy " f"({self}.{attr})"
            )
        # Return a copy of self rather than modifying self in place
        # since self could be an indirect reference via a variable or
        # parameter
        new_self = copy.deepcopy(self)
        new_self._modifiers.append(attr)
        return new_self
```

**`__getattr__`方法**

- `__getattr__` 方法是 Python 的特殊方法，当尝试访问 `AttrProxy` 对象的一个属性时，如果该属性不存在，则会调用这个方法。
- 如果属性名以下划线开头（通常表示私有属性），则调用父类的 `__getattr__`。
- 如果代理对象已经绑定到特定的参数描述（`self._pdesc`存在），则抛出 `AttributeError` 异常，因为绑定的代理对象不应再被进一步修改。
- 否则，创建代理对象的深拷贝，添加当前属性名到 `self._modifiers` 列表中，并返回新的代理对象。

```python
    # support indexing on proxies (e.g., Self.cpu[0])
    def __getitem__(self, key):
        if not isinstance(key, int):
            raise TypeError("Proxy object requires integer index")
        if hasattr(self, "_pdesc"):
            raise AttributeError("Index operation on bound proxy")
        new_self = copy.deepcopy(self)
        new_self._modifiers.append(key)
        return new_self
```

**`__getitem__`方法**

- `__getitem__` 方法用于处理对代理对象的索引操作，例如 `Self.cpu[0]`。
- 接受一个整数键 `key` 并对其进行处理。
- 如果代理对象已经绑定到特定的参数描述（`self._pdesc`存在），则抛出 `AttributeError` 异常，因为绑定的代理对象不应再被进一步修改。
- 创建代理对象的深拷贝，添加索引键到 `self._modifiers` 列表中，并返回新的代理对象。

```python
    def find(self, obj):
        try:
            val = getattr(obj, self._attr)
            visited = False
            if hasattr(val, "_visited"):
                visited = getattr(val, "_visited")

            if visited:
                return None, False

            if not isproxy(val):
                # for any additional unproxying to be done, pass the
                # current, rather than the original object so that proxy
                # has the right context
                obj = val

        except:
            return None, False
        while isproxy(val):
            val = val.unproxy(obj)
        for m in self._modifiers:
            if isinstance(m, str):
                val = getattr(val, m)
            elif isinstance(m, int):
                val = val[m]
            else:
                assert "Item must be string or integer"
            while isproxy(val):
                val = val.unproxy(obj)
        return val, True
```

**`find`方法**

- `find` 方法用于在给定的对象中查找代理对象表示的属性。
- 首先，尝试通过 `getattr` 函数获取给定对象中的属性值。
- 如果属性值是另一个代理对象，则对其进行解除代理。
- 然后，根据 `self._modifiers` 列表中的修饰操作对属性值进行链式访问。
- 返回最终的属性值和一个布尔标志，表示是否找到所需属性。

```python
    def path(self):
        p = self._attr
        for m in self._modifiers:
            if isinstance(m, str):
                p += f".{m}"
            elif isinstance(m, int):
                p += "[%d]" % m
            else:
                assert "Item must be string or integer"
        return p
```

**`path`方法**

- `path` 方法返回代理对象表示的属性的路径。
- 起始路径是代理对象所表示的属性名（`self._attr`）。
- 根据 `self._modifiers` 列表中的修饰操作，构建最终的路径字符串。



### class `AnyProxy`

`AllProxy` 类是 `BaseProxy` 类的一个子类，用于表示代理对象的一个特殊类型：**遍历整个子树（不仅仅是子节点）并添加所有特定类型的对象**。`AllProxy` 类的主要目的是为特定类型的对象提供一种搜索和遍历整个子树的方法

```python
# The AllProxy traverses the entire sub-tree (not only the children)
# and adds all objects of a specific type
class AllProxy(BaseProxy):
    def find(self, obj):
        return obj.find_all(self._pdesc.ptype)

    def path(self):
        return "all"
```

**`find` 方法**

- `find` 方法是 `AllProxy` 类的一个成员方法，它接受一个对象 `obj` 作为参数，并在该对象的子树中查找所有与代理对象参数描述 (`self._pdesc.ptype`) 指定类型匹配的对象。
- 该方法通过调用 `obj.find_all(self._pdesc.ptype)` 来执行搜索，查找整个子树中所有与指定类型匹配的对象。
- 这个方法返回找到的所有对象的列表。

**`path` 方法**

- `path` 方法返回代理对象表示的路径。在 `AllProxy` 类中，路径是一个简单的字符串 `"all"`，表示代理对象遍历整个子树的行为。



### Function `isproxy`

```python
def isproxy(obj):
    from . import params

    if isinstance(obj, (BaseProxy, params.EthernetAddr)):
        return True
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            if isproxy(v):
                return True
    return False
```

- **导入模块**：函数开头导入了模块 `params`，这是为了在后续代码中使用 `params.EthernetAddr` 类型。
- **检查对象类型**：首先，函数使用 `isinstance` 来检查 `obj` 是否是 `BaseProxy` 类的实例或者 `params.EthernetAddr` 类型的实例。
  - 如果 `obj` 是 `BaseProxy` 的实例，这意味着 `obj` 是一个代理对象，函数返回 `True`。
  - 如果 `obj` 是 `params.EthernetAddr` 的实例，这意味着 `obj` 是一个以太网地址类型对象，函数也返回 `True`。
- **递归检查列表和元组**：如果 `obj` 是一个列表或元组类型，函数将遍历其中的每个元素。
  - 对于每个元素，如果元素是代理对象（通过递归调用 `isproxy` 函数检查），函数返回 `True`。
- **默认返回 `False`**：如果给定的对象既不是 `BaseProxy` 的实例，也不是 `params.EthernetAddr` 的实例，而且也不是包含代理对象的列表或元组，函数将返回 `False`



### class `ProxyFactory`

```python
class ProxyFactory:
    def __init__(self, search_self, search_up):
        self.search_self = search_self
        self.search_up = search_up

    def __getattr__(self, attr):
        if attr == "any":
            return AnyProxy(self.search_self, self.search_up)
        elif attr == "all":
            if self.search_up:
                assert "Parant.all is not supported"
            return AllProxy(self.search_self, self.search_up)
        else:
            return AttrProxy(self.search_self, self.search_up, attr)
```

- **构造函数**(`__init__`)：`ProxyFactory`类的构造函数接受两个参数`search_self`和`search_up`，并将它们存储为实例属性。这两个参数决定了代理对象的搜索行为：
  - `search_self`: 如果为`True`，代理对象将在当前对象中进行搜索。
  - `search_up`: 如果为`True`，代理对象将在父对象中进行搜索。
- **`__getattr__`方法**：这是Python中的一种特殊方法，当尝试访问`ProxyFactory`对象的某个属性时，如果该属性不存在，则会调用这个方法。在这里，这个方法根据传入的属性名（`attr`）返回不同的代理对象：
  - 如果`attr`是`"any"`，则返回一个`AnyProxy`对象，该对象处理任何属性的搜索。
  - 如果`attr`是`"all"`，则返回一个`AllProxy`对象，该对象处理所有属性的搜索。
  - 对于其他属性名，返回一个`AttrProxy`对象，该对象处理特定属性的搜索。



### Global Objects

```python
# global objects for handling proxies
Parent = ProxyFactory(search_self=False, search_up=True)
Self = ProxyFactory(search_self=True, search_up=False)

# limit exports on 'from proxy import *'
__all__ = ["Parent", "Self"]
```

**`ProxyFactory` 类实例化**

- `Parent` 对象被实例化为 `ProxyFactory(search_self=False, search_up=True)`：
  - `search_self=False` 表示 `Parent` 不会在当前对象（`self`）中进行搜索。
  - `search_up=True` 表示 `Parent` 会在父对象（`parent`）中进行搜索。
  - 这意味着 `Parent` 对象主要用于在父对象的范围内搜索特定的属性或参数。
- `Self` 对象被实例化为 `ProxyFactory(search_self=True, search_up=False)`：
  - `search_self=True` 表示 `Self` 会在当前对象（`self`）中进行搜索。
  - `search_up=False` 表示 `Self` 不会在父对象（`parent`）中进行搜索。
  - 这意味着 `Self` 对象主要用于在当前对象的范围内搜索特定的属性或参数。

**`__all__` 限制导出**

- 代码通过 `__all__` 列表限制了从 `proxy` 模块导出的内容。
- `__all__` 列表包含了 `"Parent"` 和 `"Self"`，这意味着当通过 `from proxy import *` 导入时，只会导入这两个对象。
- 这是一种控制模块公开接口的方式，只暴露特定的对象和功能，而隐藏其他的模块成员。





## gem5 仿真SimObject

`class SimObject(metaclass=MetaSimObject):`

> 定义一个新的类 `SimObject`，它指定了 `MetaSimObject` 作为该类的元类（metaclass）。`SimObject` 类在 gem5 模拟器中是一个非常重要的基类，许多其他模拟对象（例如组件、模块）都继承自 `SimObject`。

`simulate.py`

```python
# Create the C++ sim objects and connect ports
    for obj in root.descendants():
        obj.createCCObject()
    for obj in root.descendants():
        obj.connectPorts()
```

`SimObject.py`

```python
# Call C++ to create C++ object corresponding to this object
    def createCCObject(self):
        if self.abstract:
            fatal(f"Cannot instantiate an abstract SimObject ({self.path()})")
        self.getCCParams()
        self.getCCObject()  # force creation
```

`SimObject.py`

```python
def getCCParams(self):
        if self._ccParams:
            return self._ccParams

        # Ensure that m5.internal.params is available.
        import m5.internal.params

        cc_params_struct = getattr(m5.internal.params, f"{self.type}Params")
        cc_params = cc_params_struct()
        cc_params.name = str(self)

        param_names = list(self._params.keys())
        param_names.sort()
        for param in param_names:
            value = self._values.get(param)
            if value is None:
                fatal(
                    "%s.%s without default or user set value",
                    self.path(),
                    param,
                )
            
            value = value.getValue()
            if isinstance(self._params[param], VectorParamDesc):
                assert isinstance(value, list)
                vec = getattr(cc_params, param)
                assert not len(vec)
                # Some types are exposed as opaque types. They support
                # the append operation unlike the automatically
                # wrapped types.
                if isinstance(vec, list):
                    setattr(cc_params, param, list(value))
                else:
                    for v in value:
                        getattr(cc_params, param).append(v)
            else:
                setattr(cc_params, param, value)

        port_names = list(self._ports.keys())
        port_names.sort()
        for port_name in port_names:
            port = self._port_refs.get(port_name, None)
            if port != None:
                port_count = len(port)
            else:
                port_count = 0
            setattr(
                cc_params,
                "port_" + port_name + "_connection_count",
                port_count,
            )
        self._ccParams = cc_params
        return self._ccParams
```

**`getCCParams`方法** 生成一个模拟对象的参数并返回

* 如果之前已经生成过该对象（保存在 `self._ccParams` 属性中），则直接返回该对象，以避免重复计算

- **导入必要模块**：确保导入了 `m5.internal.params` 模块，该模块可能包含模拟系统的参数结构定义。

- **获取参数结构**：从 `m5.internal.params` 中获取与当前对象类型对应的参数结构类（通过 `getattr` 调用）。参数结构类的名称是 `{self.type}Params`，其中 `self.type` 是当前对象的类型。

  > 例如`MemCtrl`类的参数结构类是`MemCtrlParams`

- **实例化参数对象**：创建参数结构类的实例 `cc_params`。

- **设置参数对象名称**：将 `cc_params.name` 设置为当前对象的名称（通过 `str(self)` 调用）。

* **配置参数对象**

  - 遍历参数：遍历当前对象的所有参数（`self._params`）。

    - 对于每个参数，获取其值（从 `self._values` 获取）。

    - 如果参数值为空，调用 `fatal` 抛出异常，因为参数没有默认值或用户设置值。

    - 将参数值转换为实际值（通过 `getValue` 调用）。

      >  ` def getValue(self):    return [v.getValue() for v in self]`  `params.py`
      >
      > 返回一个列表。这个列表是通过遍历当前对象（通常是一个可迭代对象，例如列表或元组）并对每个元素调用 `getValue()` 方法而生成的。具体来说:
      >
      > * 方法使用列表推导式遍历当前对象 `self` 的所有元素。这意味着当前对象 `self` 必须是一个可迭代对象，例如列表或元组
      > * **调用 `getValue()`**：对于遍历到的每个元素 `v`，方法调用 `v.getValue()` 方法。这假定每个元素都有一个 `getValue()` 方法
      > * **返回结果**：将每次调用 `v.getValue()` 方法得到的结果收集到一个列表中，并返回该列表。
      >
      > **代理对象**：这种 `getValue()` 方法通常用于处理代理对象数组或列表。每个代理对象都有自己的 `getValue()` 方法，该方法返回代理对象的实际值。
      >
      > **递归获取值**：通过递归地调用 `getValue()` 方法，该代码可以从嵌套的可迭代对象（如列表嵌套列表）中获取实际值。

      > `SimObject.py` 
      >
      >   `def getValue(self):    return self.getCCObject()`

    - 如果参数是一个向量（`VectorParamDesc`），则将参数值作为列表设置到 `cc_params` 中。

    - 否则，将参数值直接设置到 `cc_params` 中。

* **配置端口数量**

  * **遍历端口**：遍历当前对象的所有端口（`self._ports`）。

  - 对于每个端口，获取其引用对象（`self._port_refs` 中的端口引用）。

  - 计算端口连接数量，并将其设置到 `cc_params` 中，属性名为 `"port_" + port_name + "_connection_count"`
