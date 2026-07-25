+++
title = "Tracking progress with IntFlag"
date = "2026-01-06"
description = "Use enums and bit masks to track integration steps in an elegant way."
slug = "tracking-progress-with-intflag"
tags = ["python", "tips", "enum", "intflag"]
categories = ["python"]
+++

![Tracking](/images/tracking.png)

## The Problem

Imagine you are integrating a new product into your system. This product must have complete details and specifications before being published. But that information is added in separate steps, and not necessarily in order. How do you check that every step has been completed?

A naive solution would be to use a boolean variable for each step:

```python
class ProductTrack(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    has_specification = models.BooleanField(default=False)
    has_detail = models.BooleanField(default=False)
    
    def is_complete(self):
        return self.has_specification and self.has_detail
```

But what if you need to add more steps? Or remove one? Every change means touching the model, running database migrations and adjusting the logic.

## The Solution: IntFlag

Python offers the `IntFlag` class from the `enum` module, which lets you use bit masks in an elegant and readable way. The idea is to represent each step as a different bit in an integer.

```python
from enum import IntFlag, auto

class ProductInfo(IntFlag):
    NONE = 0
    HAS_SPECIFICATION = auto()
    HAS_DETAIL = auto()
    ALL_INFO = HAS_SPECIFICATION | HAS_DETAIL


class ProductTrack(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='track',
        verbose_name='Product',
    )
    flag = models.IntegerField(default=ProductInfo.NONE.value)

    def __str__(self):
        return f'Tracking of {self.product.name}'

    def flag_as(self, flag):
        self.flag |= flag

    def has_flag(self, flag):
        return bool(self.flag & flag)

    def is_complete(self):
        return self.flag == ProductInfo.ALL_INFO
```

## How Does It Work?

### Bit Masks

Each enum value represents a power of 2 in binary:

```python
# auto() generates the values automatically
HAS_SPECIFICATION = 1  # binary: 0001
HAS_DETAIL = 2         # binary: 0010
```

When we combine values using the `|` operator (bitwise OR), we are "turning on" multiple bits:

```python
ALL_INFO = HAS_SPECIFICATION | HAS_DETAIL  # binary: 0011 (decimal: 3)
```

### Operations with IntFlag

The `flag_as` method uses the `|=` operator (OR-equals) to add a flag without removing the existing ones:

```python
track.flag_as(ProductInfo.HAS_SPECIFICATION)
# If flag was 0 (0000), it is now 1 (0001)

track.flag_as(ProductInfo.HAS_DETAIL)
# If flag was 1 (0001), it is now 3 (0011)
```

To check whether a specific flag is set, you can use the `has_flag` method:

```python
if track.has_flag(ProductInfo.HAS_SPECIFICATION):
    print("Has specification!")
```

## Advantages

1. **Flexibility**: adding new steps is trivial, just include a new line in the enum:

```python
class ProductInfo(IntFlag):
    NONE = 0
    HAS_SPECIFICATION = auto()
    HAS_DETAIL = auto()
    HAS_IMAGE = auto()  # New step!
    ALL_INFO = HAS_SPECIFICATION | HAS_DETAIL | HAS_IMAGE
```

2. **Efficiency**: a single integer column in the database instead of several booleans.

3. **Readability**: the code is expressive and self-documenting.

4. **Compatibility**: it works with any framework (Django, Flask, etc) or with no framework at all.

## Final Thoughts

Even though the example uses Django, the solution is generic and can be applied in any Python context where you need to track state or progress. IntFlag is a powerful tool that combines the efficiency of bit masks with the readability of enums.

That's it, folks!

See you next time!

{}'s
