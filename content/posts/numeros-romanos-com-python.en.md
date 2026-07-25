+++
title = "Roman Numerals with Python"
date = "2026-02-14"
description = "Turn your Python code into an elegant DSL for roman numerals using __getattr__ in modules."
tags = ["python", "dsl", "metaprogramming"]
categories = ["python"]
slug = "roman-numerals-with-python"
+++

![Roman Numerals](/images/numeros-romanos.png "Two people in roman costumes with speech balloons saying '5' and 'V'")

## Roman Numerals

Imagine writing Python code like this:

```python
import roman

print(roman.X)      # 10
print(roman.IV)     # 4
print(roman.XLII)   # 42
print(roman.MCMXC)  # 1990
```

Simply elegant, isn't it? No functions, no explicit conversions, just... roman numerals being roman numerals. It is as if the language naturally understood this thousand-year-old system.

## Internal DSLs and the Magic of `__getattr__`

A DSL (Domain-Specific Language) is basically a language created for a specific purpose. There are **external** ones (with their own syntax) and **internal** ones (which piggyback on the syntax of the language you already use). What we are going to create here is an **internal DSL**.

If you have ever programmed in Ruby, you probably know `method_missing`, that special method called when we try to use something that does not exist. It is like a "wildcard" that captures undefined calls and does something with them.

In the book "Seven Languages in Seven Weeks" by Bruce Tate, there is a very nice example of a roman numeral DSL in Ruby using that technique. The code responds dynamically when you try to access any name that looks like a roman numeral.

Python has something similar: `__getattr__`, and better yet, since Python 3.7 it works not only in classes but also in **modules**!

## The Implementation

The idea is simple: we are going to take advantage of Python's ability to intercept access to attributes that do not exist.

The trick is defining `__getattr__` at the module level. When you try to access something that does not exist (something like `roman.XIV`), Python automatically calls that function passing the attribute name. This is where the magic happens:

```python
# roman.py
def __getattr__(name):
    name = (
        name.replace("IV", "IIII")
        .replace("IX", "VIIII")
        .replace("XL", "XXXX")
        .replace("XC", "LXXXX")
        .replace("CD", "CCCC")
        .replace("CM", "DCCCC")
    )

    return sum(
        name.count(c) * v for c, v in zip("MDCLXVI", [1000, 500, 100, 50, 10, 5, 1])
    )
```

Only 13 lines! The logic is clever:

1. **Normalization**: replaces subtractive forms (IV, IX, XL, etc.) with additive forms (IIII, VIIII, XXXX, etc.)
2. **Elegant sum**: counts each roman symbol, multiplies it by its value and adds everything up

## Why Is This Cool?

A good DSL makes the code cleaner and closer to what you actually want to say. Look at the difference:

```python
# The traditional way:
roman_to_int("MMXXVI")

# With a DSL:
roman.MMXXVI
```

See? The second way drops the function and the quotes. It reads more naturally, closer to what you were thinking. The code becomes easier to read and understand.

## More Examples

```python
import roman

# Historical years
print(f"Renaissance: {roman.MCDL}")             # 1450
print(f"French Revolution: {roman.MDCCLXXXIX}") # 1789

# Book chapters
chapter = roman.VIII  # 8

# Century
century = roman.XXI  # 21
```

## The Pros and Cons

This technique is cool, but it has its limits:

- **Debugging**: if you make a typo, you will not catch the error at development time
- **Tooling**: IDEs will not be able to autocomplete or warn you about problems
- **Performance**: there is a small cost because of the dynamic interception

When is it worth using? It depends on the context. For roman numerals in educational code or scripts? Absolutely! For critical production APIs? A plain, explicit function is probably better.

The important thing is finding the balance between making the code expressive and keeping it easy to maintain.

## Conclusion

`__getattr__` in modules is a powerful tool for creating elegant internal DSLs in Python. Inspired by examples from Ruby and other languages, we see that Python offers some really nice features for writing more expressive and natural code.

When you design an API, think: "How can I make this more natural and cleaner?". But also ask: "Is it worth it in this specific case?".

Sometimes the answer lies in using just the right amount of metaprogramming. ✨

That's it, folks!

See you next time!

{}'s
