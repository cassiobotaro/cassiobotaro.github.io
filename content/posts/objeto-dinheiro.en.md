+++
title = "The Money Object"
date = "2026-03-01"
description = "Implementing the Money pattern in Python with dataclasses."
slug = "the-money-object"
tags = ["python", "tips", "dataclass", "patterns"]
categories = ["python"]
+++

![Money](/images/dinheiro.png)

## The Story

A while ago I took part in the hiring process of a fairly well known purple bank. I did not get in, but I got valuable feedback about the code I wrote. Putting that feedback together with things I learned afterwards, I decided to revisit the challenge and improve the implementation.

One of the most significant improvements was creating a `Money` object, based on the pattern of the same name described by Martin Fowler in *Patterns of Enterprise Application Architecture* (PEAA).

## The Problem

When we represent money as a plain number, strange things can happen:

```python
>>> 0.1 + 0.2
0.30000000000000004

>>> price = 19.99
>>> price * 3
59.970000000000006
```

Floating point and money do not mix. On top of that, a number by itself carries no information about the currency. Nothing stops you from adding reais to dollars, and that is exactly the kind of silent bug that shows up in production.

The core idea of the Money pattern is treating money as a complete object: with an amount, a currency and its own arithmetic rules. Let's build it step by step.

## The Foundation: A Frozen Dataclass

We start by defining the structure with `dataclass`. We use `frozen=True` to make the object immutable, just like in the real world, where an amount of money does not change: when you pay R$ 10.00 and get R$ 3.00 back as change, new values come into existence, the original one stays the same.

```python
from dataclasses import dataclass, field, InitVar
from decimal import Decimal

TWOPLACES = Decimal("0.01")
DEFAULT_CURRENCY = "BRL"

@dataclass(frozen=True)
class Money:
    raw_amount: InitVar[Decimal | float | str]
    amount: Decimal = field(init=False)
    currency: str = DEFAULT_CURRENCY
```

We have three fields here, but each one plays a different role:

- **`raw_amount`** is marked with `InitVar`. That means it is a constructor parameter, but it does **not** become an attribute of the object. It only exists to receive the raw value at creation time.
- **`amount`** uses `field(init=False)`, which means it does **not** show up in the constructor. It will be computed internally, and we will see how next.
- **`currency`** is a regular field with the default value `"BRL"`.

That separation between what the user passes in (`raw_amount`) and what the object stores (`amount`) is what lets us process the value before storing it.

## Guaranteeing Two Decimal Places

The `__post_init__` method is called automatically by `dataclass` right after `__init__`. It receives the fields marked with `InitVar` as arguments, in our case `raw_amount`:

```python
def __post_init__(self, raw_amount):
    quantized_amount = Decimal(raw_amount).quantize(TWOPLACES)
    object.__setattr__(self, "amount", quantized_amount)
```

Let's go line by line:

1. `Decimal(raw_amount)` converts the raw value to `Decimal`, which is the ideal type for working with monetary values (without the floating point problems).
2. `.quantize(TWOPLACES)` rounds it to exactly two decimal places. The `TWOPLACES` constant is `Decimal("0.01")`, which serves as a template: "I want the same precision as 0.01".
3. `object.__setattr__(...)` is necessary because the dataclass is `frozen`. In a frozen dataclass, direct assignments like `self.amount = value` raise a `FrozenInstanceError`. The trick is calling `__setattr__` from the base class `object`, which bypasses that protection. It is safe here because we are inside initialization.

Here is the result:

```python
>>> Money("10.5")
Money(amount=Decimal('10.50'), currency='BRL')

>>> Money(1)
Money(amount=Decimal('1.00'), currency='BRL')

>>> Money("9.999")
Money(amount=Decimal('10.00'), currency='BRL')
```

No matter what is passed in, `amount` will always have two decimal places.

## Currency: Preventing Invalid Operations

The `currency` field is not merely informative, it works as a safety lock. Before any operation between two `Money` objects, we check that the currencies match:

```python
def _assert_same_currency_as(self, other):
    if self.currency != other.currency:
        raise ValueError(
            f"Different currencies: {self.currency} and {other.currency}"
        )
```

This method is private (the `_` prefix) because it is an internal detail, whoever uses `Money` does not need to call it directly. It will be used inside the arithmetic and comparison operations.

If someone tries to add different currencies, the error is clear and immediate:

```python
>>> Money("10.00", "BRL") + Money("5.00", "USD")
ValueError: Different currencies: BRL and USD
```

Without that kind of validation, the code would silently add the values and the bug would only show up much later.

## Overloading the Arithmetic Operators

Python lets objects define how they behave with operators like `+`, `-`, `*` and `/`. All it takes is implementing the corresponding special methods.

For **addition and subtraction**, we operate between two `Money` objects and check the currency first:

```python
def __add__(self, other):
    self._assert_same_currency_as(other)
    return Money(self.amount + other.amount, self.currency)

def __sub__(self, other):
    self._assert_same_currency_as(other)
    return Money(self.amount - other.amount, self.currency)
```

For **multiplication and division**, the operation is between `Money` and a scalar (an integer or a decimal). It makes sense to multiply a price by a quantity, but it makes no sense to multiply a price by another price:

```python
def __mul__(self, scalar):
    return Money(self.amount * Decimal(scalar), self.currency)

__rmul__ = __mul__

def __truediv__(self, scalar):
    return Money(self.amount / Decimal(scalar), self.currency)
```

`__rmul__` deserves an explanation. When we write `Money("10.00") * 3`, Python calls `Money.__mul__(3)`. But when we flip it to `3 * Money("10.00")`, Python first tries `int.__mul__(Money(...))`, which does not know how to handle `Money` and returns `NotImplemented`. Then Python tries the right-hand side: `Money.__rmul__(3)`. Without `__rmul__`, that expression would fail. Since multiplication is commutative, pointing `__rmul__` at the same method is enough.

Note that each operation returns a **new** `Money` object, no operation changes the original object, which keeps immutability intact.

```python
>>> Money("10.00") + Money("5.50")
Money(amount=Decimal('15.50'), currency='BRL')

>>> Money("100.00") - Money("30.00")
Money(amount=Decimal('70.00'), currency='BRL')

>>> Money("25.00") * 3
Money(amount=Decimal('75.00'), currency='BRL')

>>> 2 * Money("15.00")
Money(amount=Decimal('30.00'), currency='BRL')

>>> Money("100.00") / 3
Money(amount=Decimal('33.33'), currency='BRL')
```

## Full Comparison with total_ordering

To sort a list of prices or check whether one value is greater than another, our object needs to be **comparable**. In Python, that means implementing methods like `__eq__` (equal), `__lt__` (less than), `__le__` (less than or equal), `__gt__` (greater than) and `__ge__` (greater than or equal). That is five methods, and implementing them all by hand is tedious and error prone.

Here is the big trick: `dataclass` already generates `__eq__` automatically, comparing all the object's fields. Two `Money` objects are equal if they have the same `amount` **and** the same `currency`. That comes for free.

We only need to implement `__lt__`:

```python
from functools import total_ordering

@dataclass(frozen=True)
@total_ordering
class Money:
    ...

    def __lt__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        self._assert_same_currency_as(other)
        return self.amount < other.amount
```

The `isinstance` check makes sure we only compare `Money` with `Money`. If someone tries `Money("10.00") < 42`, we return `NotImplemented`, which is Python's way of saying "I do not know how to make this comparison", letting the other side try.

The `@total_ordering` decorator finishes the job: from `__eq__` (from the dataclass) and `__lt__` (ours), it **automatically generates** the `__le__`, `__gt__` and `__ge__` methods. With two pieces, we assemble the whole puzzle:

```python
>>> Money("10.00") == Money("10.00")
True

>>> Money("10.00") < Money("20.00")
True

>>> Money("20.00") >= Money("15.00")
True

>>> Money("5.00") != Money("5.00", "USD")
True
```

The `Money` object is now **totally ordered**, and can even be used in lists with `sort()` and `sorted()`.

## An Alternative Constructor: Zero

In many situations we need a zero value as a starting point: in accumulators, as the initial value in reductions, or simply to represent "no value". A class method offers an expressive way to create that object:

```python
@classmethod
def zero(cls, currency=DEFAULT_CURRENCY):
    return cls("0.00", currency)
```

We use `cls` instead of `Money` directly so the method also works correctly in subclasses. Here is how it looks in practice:

```python
>>> Money.zero()
Money(amount=Decimal('0.00'), currency='BRL')

>>> Money.zero("USD")
Money(amount=Decimal('0.00'), currency='USD')
```

A very common use is as the initial value in a reduction. Imagine summing a list of prices:

```python
>>> from functools import reduce
>>> prices = [Money("10.00"), Money("20.00"), Money("30.00")]
>>> reduce(lambda a, b: a + b, prices, Money.zero())
Money(amount=Decimal('60.00'), currency='BRL')
```

Without `Money.zero()`, we would have to write `Money("0.00")`. It works, but `Money.zero()` communicates the intent better.

## The Complete Code

Here is the `Money` object in full:

```python
from collections.abc import Sequence
from dataclasses import InitVar, dataclass, field
from decimal import Decimal
from functools import total_ordering

TWOPLACES = Decimal("0.01")
DEFAULT_CURRENCY = "BRL"

type Scalar = int | Decimal
type DecimalConvertible = Decimal | float | str | tuple[int, Sequence[int], int]


@dataclass(frozen=True)
@total_ordering
class Money:
    raw_amount: InitVar[DecimalConvertible]
    amount: Decimal = field(init=False)
    currency: str = DEFAULT_CURRENCY

    def __post_init__(self, raw_amount: DecimalConvertible) -> None:
        quantized_amount = Decimal(raw_amount).quantize(TWOPLACES)
        object.__setattr__(self, "amount", quantized_amount)

    def _assert_same_currency_as(self, other: Money) -> None:
        if self.currency != other.currency:
            raise ValueError(
                f"Different currencies: {self.currency} and {other.currency}"
            )

    def __add__(self, other: Money) -> Money:
        self._assert_same_currency_as(other)
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: Money) -> Money:
        self._assert_same_currency_as(other)
        return Money(self.amount - other.amount, self.currency)

    def __mul__(self, scalar: Scalar) -> Money:
        return Money(self.amount * Decimal(scalar), self.currency)

    __rmul__ = __mul__

    def __truediv__(self, scalar: Scalar) -> Money:
        return Money(self.amount / Decimal(scalar), self.currency)

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented

        self._assert_same_currency_as(other)
        return self.amount < other.amount

    @classmethod
    def zero(cls, currency: str = DEFAULT_CURRENCY) -> Money:
        return cls("0.00", currency)
```

## Final Thoughts

The Money pattern is a great example of a *Value Object*, an object defined by its value, not by its identity. By encapsulating rounding rules, currency validation and arithmetic operations in a single place, code that deals with money becomes more expressive and safer.

In this article we saw how Python offers tools that fit this pattern perfectly:

- **`dataclass`** to generate the constructor, `__repr__` and `__eq__` automatically.
- **`InitVar`** and **`__post_init__`** to process input values before storing them.
- **Special methods** (`__add__`, `__sub__`, `__mul__`, `__truediv__`) for a natural interface with operators.
- **`@total_ordering`** combined with the dataclass `__eq__` and a single `__lt__` to make the object fully comparable.
- **`@classmethod`** for expressive alternative constructors like `Money.zero()`.

Sometimes not passing a technical assignment is only the beginning of the learning.

That's it, folks!

See you next time!

{}'s
