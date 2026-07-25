+++
title = "When Python Meets RPG: Rolling Dice with Style"
date = "2026-02-01"
description = "Creating a friendly Domain Specific Language for RPG dice rolling using operator overloading in Python."
tags = ["python", "dsl", "rpg", "oop"]
categories = ["python", "oop"]
slug = "dice-rolling-dsl"
+++

![People playing RPG](/images/rpg.png "People playing RPG")

## Shall we roll the dice?

Imagine being able to write RPG dice rolls as naturally as:

```python
3 * D6 + 2 * D10
```

And running a roll simply with:

```python
(3 * D10 + 1 * D4).roll()
```

That is possible in Python through operator overloading! Let's create a DSL (Domain Specific Language) to make dice rolling intuitive and expressive.

## A Bit of Context

In my teenage years I was an RPG game master and had a lot of fun playing Vampire: The Masquerade and Tagmar. Recently, while taking an online Smalltalk course, I came across a similar example of a dice rolling DSL. I found the idea brilliant and decided to implement it in Python! It was a lot of fun exploring how operator overloading can create such a natural and expressive interface.

## The Implementation

Let's start with the `Die` class:

```python
import random


class Die:
    def __init__(self, faces=6):
        super().__init__()
        self.faces = faces

    def roll(self):
        return random.randint(1, self.faces)

    @classmethod
    def with_faces(cls, an_integer):
        return cls(an_integer)

    def __repr__(self):
        return f"Die({self.faces})"
```

### Optional Parameters in the Constructor

Note that, even though we have a `with_faces` method acting as an alternative constructor, **Python has optional parameters in the constructor with default values**. In our case, `faces=6` means that if we do not specify the number of faces, the die will have 6 faces by default (like an ordinary die). That makes the class more flexible and more pythonic!

You can create a die like this:

```python
d6 = Die()        # 6-faced die (default)
d20 = Die(20)     # 20-faced die
d10 = Die.with_faces(10)  # Using the alternative constructor
```

### The Magic of Operator Overloading

Now comes the most interesting part, the `DieHandle` class, which lets us combine dice using math operators:

```python
class DieHandle:
    def __init__(self):
        self.dice = []

    def add_die(self, a_die):
        self.dice.append(a_die)

    def dice_number(self):
        return len(self.dice)

    def roll(self):
        return sum(die.roll() for die in self.dice)

    def max_value(self):
        return sum(die.faces for die in self.dice)

    def __add__(self, other):
        if not isinstance(other, DieHandle):
            return NotImplemented

        new_handle = DieHandle()
        for die in self.dice:
            new_handle.add_die(die)

        for die in other.dice:
            new_handle.add_die(die)

        return new_handle

    def __mul__(self, other):
        if not isinstance(other, int):
            return NotImplemented

        new_handle = DieHandle()
        for _ in range(other):
            for die in self.dice:
                new_handle.add_die(die)

        return new_handle

    __rmul__ = __mul__
```

The overloading happens through the special methods:

- `__add__`: lets us use the `+` operator to combine groups of dice
- `__mul__`: lets us use `*` to multiply dice (e.g. `3 * D6` creates three 6-faced dice)
- `__rmul__`: enables reverse multiplication, making `3 * D6` work (not just `D6 * 3`)

Note that we return `NotImplemented` when the operand is not of the expected type, letting Python try other methods or raise an appropriate error.

### Creating Convenient Shortcuts

To make it even easier, we create a helper function and some predefined constants:

```python
def D(a_number):
    handle = DieHandle()
    handle.add_die(Die.with_faces(a_number))
    return handle


D10 = D(10)
D12 = D(12)
D20 = D(20)
D4 = D(4)
D6 = D(6)
D8 = D(8)
```

## Using the DSL

Now we can write natural expressions for dice rolling:

```python
# Rolling 3 six-faced dice
result = (3 * D6).roll()

# Combining different kinds of dice
attack = (2 * D20 + 1 * D4).roll()

# Checking the maximum possible value
max_damage = (3 * D10 + 1 * D4).max_value()  # 34

# Checking how many dice we have
dice_count = (3 * D6 + 2 * D10).dice_number()  # 5
```

## Conclusion

Operator overloading in Python lets us create elegant and expressive DSLs. In this case, we turned simple math operations into an intuitive interface for RPG dice rolling.

The code not only works well, it also reads naturally, almost like human language. This exercise, inspired by the Smalltalk course, shows how concepts from different languages can be adapted and enrich the way we program in Python!

That's it, folks!

See you next time!

{}'s
