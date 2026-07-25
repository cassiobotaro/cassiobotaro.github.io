+++
title = "The write protocol"
date = "2026-05-12"
publishDate = "2026-05-15"
description = "Starting with Python 3.14, io.Writer and io.Reader express exactly what your function needs, without dragging along the whole interface of a file-like object."
slug = "write-protocol"
tags = ["python", "tips", "typing"]
categories = ["python"]
series = ["quick-tips"]
+++

## The problem

When a function only needs to write to a stream, typing the argument as [`IO[str]`](https://docs.python.org/3/library/typing.html#typing-io) is overkill, since you are demanding `read`, `seek`, `close` and the rest of the interface, even though you will never use them.

## The tip

Starting with **Python 3.14**, the `io` module exposes the `Writer[T]` and `Reader[T]` protocols. They describe only the minimum contract (`write()` or `read()`), so any object that implements just that method already satisfies the type.

### Before

```python {linenos=true}
from typing import IO

def dump_json(tax_list: list[OperationResult], output: IO[str]) -> None:
    ...
```

### After

```python {linenos=true}
from io import Writer

def dump_json(tax_list: list[OperationResult], output: Writer[str]) -> None:
    ...
```

On line 3, the signature now says exactly what the function does, it becomes easier to test (a stub with `write()` is enough), and it accepts more legitimate objects.

## Where the example came from

The snippet above comes from [`capital_gains/cli.py`](https://github.com/cassiobotaro/capital-gains/blob/main/capital_gains/cli.py), part of a refactoring of a technical assignment where I explored more advanced Python techniques. If you want the full context of the project, the [presentation is here](https://github.com/cassiobotaro/capital-gains/blob/main/slides.pdf).

That's it, folks!

See you next time!

{}'s
