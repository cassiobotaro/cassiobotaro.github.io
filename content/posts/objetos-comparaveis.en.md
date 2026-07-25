+++
title = "Fully comparable objects with a single method"
date = "2026-07-01"
publishDate = "2026-07-01"
description = "With dataclass and the total_ordering decorator, writing __lt__ is enough for the object to gain <, <=, >, >=, == and !=."
slug = "comparable-objects"
tags = ["python", "tips", "dataclass"]
categories = ["python"]
series = ["quick-tips"]
+++

## The problem

For an object to respond to `<`, `<=`, `>`, `>=`, `==` and `!=`, Python expects you to implement `__lt__`, `__le__`, `__gt__`, `__ge__`, `__eq__` and `__ne__`. That is six nearly identical methods, tedious to write and easy to leave inconsistent (one says `a < b` and another disagrees).

## The tip

Two pieces cover everything:

- The `dataclass` already generates `__eq__`, comparing all the object's fields.
- The `functools.total_ordering` decorator derives `__le__`, `__gt__` and `__ge__` from `__eq__` and **one** ordering method.

In other words, you write only `__lt__` and get the complete set.

### Code

```python {linenos=true}
from dataclasses import dataclass
from decimal import Decimal
from functools import total_ordering


@dataclass(frozen=True)
@total_ordering
class Money:
    amount: Decimal
    currency: str = "BRL"

    def __lt__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount < other.amount
```

The `isinstance` avoids comparing `Money` with unrelated types: returning `NotImplemented` lets the other side try. With that, sorting a list of prices with `sorted()` starts working for free.

## Where the example came from

The `Money` class is the same one from the article ["The Money Object"](/en/posts/the-money-object/), taken from [`capital_gains/money.py`](https://github.com/cassiobotaro/capital-gains/blob/main/capital_gains/money.py), a refactoring of a technical assignment where I explored more advanced Python techniques.

That's it, folks!

See you next time!

{}'s
