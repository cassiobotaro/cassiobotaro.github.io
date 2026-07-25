+++
title = "The count and index pitfall in NamedTuple"
date = "2026-01-17"
description = "Understand why using count or index fields in a NamedTuple can cause problems with static type checkers like mypy."
slug = "namedtuple-count-index-mypy"
tags = ["python", "tips", "typing", "mypy"]
categories = ["python"]
+++

![Type checking](/images/type-checking.png)

## The Problem

You are using `NamedTuple` to create your data classes and decide to add a field called `count` or `index`. Everything works perfectly at runtime, but when you run mypy or another type checker, you get strange errors. What is going on?

```python {linenos=true}
from typing import NamedTuple

class Item(NamedTuple):
    name: str
    count: int  # Danger!

item = Item(name="apple", count=5)
print(item.count)  # Works at runtime
```

Running mypy:

```bash
$ mypy example.py
example.py:7: error: Cannot assign to a method
example.py:9: error: "int" not callable
```

## Why does this happen?

`NamedTuple` inherits from `tuple`, and tuples have built-in methods called `count()` and `index()`:

```python {linenos=true}
# Built-in tuple methods
numbers = (1, 2, 3, 2, 1)
numbers.count(2)  # Returns 2 (how many times 2 appears)
numbers.index(3)  # Returns 2 (position of the first 3)
```

When you create a field with those names in a `NamedTuple`, there is a name collision. At runtime, Python gives priority to the attributes created by the `NamedTuple`, but static type checkers get confused, because they see both the method and the attribute under the same name.

## Demonstrating the Problem

Here is a more complete example:

```python {linenos=true}
from typing import NamedTuple

class Statistic(NamedTuple):
    value: str
    count: int
    index: int

# Creating it works
stats = Statistic(value="test", count=10, index=0)

# Access works at runtime
print(f"Count: {stats.count}")  # 10
print(f"Index: {stats.index}")  # 0

# But mypy complains:
# error: Cannot assign to a method
# error: "int" not callable
```

mypy detects the conflict because:

1. `tuple.count` is a method that takes a value and returns an integer
2. You are trying to define `count` as an integer attribute
3. The same goes for `index`

## The Solution

There are a few ways to solve this problem:

### 1. Rename the fields (Recommended)

The simplest and clearest solution is to use different names:

```python {linenos=true}
from typing import NamedTuple

class Statistic(NamedTuple):
    value: str
    quantity: int  # Instead of count
    position: int  # Instead of index

stats = Statistic(value="test", quantity=10, position=0)
```

### 2. Use a dataclass

If you really need those specific names, consider using `dataclass` instead of `NamedTuple`:

```python {linenos=true}
from dataclasses import dataclass

@dataclass(frozen=True)
class Statistic:
    value: str
    count: int
    index: int

stats = Statistic(value="test", count=10, index=0)
# Works perfectly with mypy!
```

The downside is that `dataclass` does not inherit from `tuple`, so you lose some features such as index access and positional unpacking. On the other hand, you gain more flexibility and avoid name collisions.

### 3. Use type: ignore (Not recommended)

As a last resort, you can suppress the mypy warnings:

```python {linenos=true}
from typing import NamedTuple

class Statistic(NamedTuple):
    value: str
    count: int  # type: ignore[misc]
    index: int  # type: ignore[misc]
```

This approach is not recommended because you are hiding a real problem and may miss other important warnings.

## Final Thoughts

This is a classic example of how static type analysis can reveal subtle problems that work at runtime but can cause confusion and hard-to-spot bugs. Always run mypy or another type checker on your code to catch these problems early!

The rule of thumb is: if you are using `NamedTuple`, avoid names that are also `tuple` methods. When you need those specific names, `dataclass` is usually a better choice.

That's it, folks!

See you next time!

{}'s
