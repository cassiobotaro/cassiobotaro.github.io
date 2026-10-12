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
from dataclasses import dataclass
from decimal import Decimal

TWOPLACES = Decimal("0.01")
DEFAULT_CURRENCY = "BRL"

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = DEFAULT_CURRENCY
```

Two fields: `amount` holds the value and `currency` holds the currency, with `"BRL"` as the default.

Notice that `amount` only accepts `Decimal`. No `float`, no string. An earlier version of this object accepted both and converted internally with `Decimal(value)`, which looks convenient. But look at what happens with a `float`:

```python
>>> from decimal import Decimal
>>> Decimal(2.675)
Decimal('2.67499999999999982236431605997495353221893310546875')

>>> Decimal("2.675")
Decimal('2.675')
```

The `float` already arrived wrong, and no rounding after that can fix it: `2.674999...` becomes `2.67`, while `2.675` becomes `2.68`. By forcing the caller to write `Decimal("2.675")`, the precision is explicit at the point where the value enters the system. If the value came from a JSON document, for example, converting the string into a `Decimal` is the job of whoever read the JSON, not of `Money`.

## Guaranteeing Two Decimal Places

The `__post_init__` method is called automatically by `dataclass` right after `__init__`. That is where we round the value:

```python
def __post_init__(self):
    object.__setattr__(self, "amount", self.amount.quantize(TWOPLACES))
```

Let's see what happens:

1. `.quantize(TWOPLACES)` rounds it to exactly two decimal places. The `TWOPLACES` constant is `Decimal("0.01")`, which serves as a template: "I want the same precision as 0.01".
2. `object.__setattr__(...)` is necessary because the dataclass is `frozen`. In a frozen dataclass, direct assignments like `self.amount = value` raise a `FrozenInstanceError`. The trick is calling `__setattr__` from the base class `object`, which bypasses that protection. It is safe here because we are inside initialization.

Here is the result:

```python
>>> Money(Decimal("10.5"))
Money(amount=Decimal('10.50'), currency='BRL')

>>> Money(Decimal(1))
Money(amount=Decimal('1.00'), currency='BRL')

>>> Money(Decimal("9.999"))
Money(amount=Decimal('10.00'), currency='BRL')
```

No matter how many places the `Decimal` brings in, `amount` will always have two.

Keep in mind that `quantize` uses the default rounding of `Decimal`, the so-called banker's rounding: an exact tie such as `10.025` becomes `10.02`, not `10.03`, because it breaks the tie towards the even digit. If your domain asks for a different behavior, pass `rounding=` to `quantize`.

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
>>> Money(Decimal("10.00"), "BRL") + Money(Decimal("5.00"), "USD")
ValueError: Different currencies: BRL and USD
```

Without that kind of validation, the code would silently add the values and the bug would only show up much later.

## Overloading the Arithmetic Operators

Python lets objects define how they behave with operators like `+`, `-`, `*` and `/`. All it takes is implementing the corresponding special methods.

For **addition and subtraction**, we operate between two `Money` objects. First we check that the other side really is a `Money`, then that the currency is the same:

```python
def __add__(self, other):
    if not isinstance(other, Money):
        return NotImplemented

    self._assert_same_currency_as(other)
    return Money(self.amount + other.amount, self.currency)

def __sub__(self, other):
    if not isinstance(other, Money):
        return NotImplemented

    self._assert_same_currency_as(other)
    return Money(self.amount - other.amount, self.currency)
```

Returning `NotImplemented` is Python's way of saying "I do not know how to do this operation". The interpreter then tries the other side and, if nobody knows, raises a `TypeError`:

```python
>>> Money(Decimal("10.00")) + 10
TypeError: unsupported operand type(s) for +: 'Money' and 'int'
```

Without that check, the error would be an `AttributeError` complaining that `int` has no `currency`, which says much less about what went wrong.

Negating a value is also part of the deal, for example to turn a loss into a positive number. All it takes is `__neg__`:

```python
def __neg__(self):
    return Money(-self.amount, self.currency)
```

For **multiplication and division**, the operation is between `Money` and a scalar. It makes sense to multiply a price by a quantity, but it makes no sense to multiply a price by another price. And, for the same reason as in the previous section, a scalar here is an `int` or a `Decimal`, never a `float`:

```python
SCALAR_TYPES = (int, Decimal)

def __mul__(self, scalar):
    if not isinstance(scalar, SCALAR_TYPES):
        return NotImplemented

    return Money(self.amount * scalar, self.currency)

__rmul__ = __mul__

def __truediv__(self, scalar):
    if not isinstance(scalar, SCALAR_TYPES):
        return NotImplemented

    return Money(self.amount / scalar, self.currency)
```

`__rmul__` deserves an explanation. When we write `Money(Decimal("10.00")) * 3`, Python calls `Money.__mul__(3)`. But when we flip it to `3 * Money(Decimal("10.00"))`, Python first tries `int.__mul__(Money(...))`, which does not know how to handle `Money` and returns `NotImplemented`. Then Python tries the right-hand side: `Money.__rmul__(3)`. Without `__rmul__`, that expression would fail. Since multiplication is commutative, pointing `__rmul__` at the same method is enough.

Note that each operation returns a **new** `Money` object, no operation changes the original object, which keeps immutability intact.

```python
>>> Money(Decimal("10.00")) + Money(Decimal("5.50"))
Money(amount=Decimal('15.50'), currency='BRL')

>>> Money(Decimal("100.00")) - Money(Decimal("30.00"))
Money(amount=Decimal('70.00'), currency='BRL')

>>> -Money(Decimal("10.00"))
Money(amount=Decimal('-10.00'), currency='BRL')

>>> Money(Decimal("25.00")) * 3
Money(amount=Decimal('75.00'), currency='BRL')

>>> 2 * Money(Decimal("15.00"))
Money(amount=Decimal('30.00'), currency='BRL')

>>> Money(Decimal("100.00")) / 3
Money(amount=Decimal('33.33'), currency='BRL')

>>> Money(Decimal("10.00")) * 0.5
TypeError: unsupported operand type(s) for *: 'Money' and 'float'

>>> Money(Decimal("10.00")) * Decimal("0.5")
Money(amount=Decimal('5.00'), currency='BRL')
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

The `isinstance` check makes sure we only compare `Money` with `Money`. If someone tries `Money(Decimal("10.00")) < 42`, we return `NotImplemented`, the same protocol we used in the arithmetic, letting the other side try.

The `@total_ordering` decorator finishes the job: from `__eq__` (from the dataclass) and `__lt__` (ours), it **automatically generates** the `__le__`, `__gt__` and `__ge__` methods. With two pieces, we assemble the whole puzzle:

```python
>>> Money(Decimal("10.00")) == Money(Decimal("10.00"))
True

>>> Money(Decimal("10.00")) < Money(Decimal("20.00"))
True

>>> Money(Decimal("20.00")) >= Money(Decimal("15.00"))
True

>>> Money(Decimal("5.00")) != Money(Decimal("5.00"), "USD")
True
```

The `Money` object is now **totally ordered**, and can even be used in lists with `sort()` and `sorted()`.

## An Alternative Constructor: Zero

In many situations we need a zero value as a starting point: in accumulators, as the initial value in reductions, or simply to represent "no value". A class method offers an expressive way to create that object:

```python
@classmethod
def zero(cls, currency=DEFAULT_CURRENCY):
    return cls(Decimal("0.00"), currency)
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
>>> prices = [Money(Decimal("10.00")), Money(Decimal("20.00")), Money(Decimal("30.00"))]
>>> reduce(lambda a, b: a + b, prices, Money.zero())
Money(amount=Decimal('60.00'), currency='BRL')
```

Without `Money.zero()`, we would have to write `Money(Decimal("0.00"))` every time. It works, but `Money.zero()` communicates the intent better.

## The Complete Code

Here is the `Money` object in full:

```python
from dataclasses import dataclass
from decimal import Decimal
from functools import total_ordering

TWOPLACES = Decimal("0.01")
DEFAULT_CURRENCY = "BRL"

type Scalar = int | Decimal
SCALAR_TYPES = (int, Decimal)


@dataclass(frozen=True)
@total_ordering
class Money:
    amount: Decimal
    currency: str = DEFAULT_CURRENCY

    def __post_init__(self) -> None:
        object.__setattr__(self, "amount", self.amount.quantize(TWOPLACES))

    def _assert_same_currency_as(self, other: Money) -> None:
        if self.currency != other.currency:
            raise ValueError(
                f"Different currencies: {self.currency} and {other.currency}"
            )

    def __add__(self, other: Money) -> Money:
        if not isinstance(other, Money):
            return NotImplemented

        self._assert_same_currency_as(other)
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: Money) -> Money:
        if not isinstance(other, Money):
            return NotImplemented

        self._assert_same_currency_as(other)
        return Money(self.amount - other.amount, self.currency)

    def __neg__(self) -> Money:
        return Money(-self.amount, self.currency)

    def __mul__(self, scalar: Scalar) -> Money:
        if not isinstance(scalar, SCALAR_TYPES):
            return NotImplemented

        return Money(self.amount * scalar, self.currency)

    __rmul__ = __mul__

    def __truediv__(self, scalar: Scalar) -> Money:
        if not isinstance(scalar, SCALAR_TYPES):
            return NotImplemented

        return Money(self.amount / scalar, self.currency)

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented

        self._assert_same_currency_as(other)
        return self.amount < other.amount

    @classmethod
    def zero(cls, currency: str = DEFAULT_CURRENCY) -> Money:
        return cls(Decimal("0.00"), currency)
```

## Final Thoughts

The Money pattern is a great example of a *Value Object*, an object defined by its value, not by its identity. By encapsulating rounding rules, currency validation and arithmetic operations in a single place, code that deals with money becomes more expressive and safer.

In this article we saw how Python offers tools that fit this pattern perfectly:

- **`dataclass`** to generate the constructor, `__repr__` and `__eq__` automatically.
- **`__post_init__`** to round the value before storing it, even with the dataclass frozen.
- **Special methods** (`__add__`, `__sub__`, `__neg__`, `__mul__`, `__truediv__`) for a natural interface with operators, and `NotImplemented` to refuse operands that make no sense.
- **`@total_ordering`** combined with the dataclass `__eq__` and a single `__lt__` to make the object fully comparable.
- **`@classmethod`** for expressive alternative constructors like `Money.zero()`.

Sometimes not passing a technical assignment is only the beginning of the learning.

That's it, folks!

See you next time!

{}'s
