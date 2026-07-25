+++
title = "Consuming iterables without allocating memory"
date = "2026-06-17"
publishDate = "2026-06-17"
description = "Consume iterables for their side effects with deque(..., maxlen=0): no intermediate list and with the loop running in C."
slug = "consuming-iterables"
tags = ["python", "tips", "iterators"]
categories = ["python"]
series = ["quick-tips"]
+++

## The problem

When you just want to "run" a `map`/generator pipeline for its side effects (writing each item to a stream, for example), the reflex is a `for` or a `list(...)`. The `list` allocates an entire list that gets thrown away right after, wasting memory for nothing. The `for` solves the memory issue, but the loop runs in pure Python.

## The tip

`collections.deque` accepts a `maxlen` parameter. With `maxlen=0`, it pulls each element and discards it immediately, never growing: that is the `itertools` [`consume`](https://docs.python.org/3/library/itertools.html#itertools-recipes) recipe. Instead of materializing a list only to throw it away, you drain the pipeline in constant memory.

The pattern is always `deque(map(...), maxlen=0)`. In a very simple case, it looks like this:

```python
from collections import deque

# runs the side effects without keeping anything
deque(map(print, range(3)), maxlen=0)
```

### With `for`

```python {linenos=true}
for line in readlines(reader_stream):
    dump_json(
        process_operations_batch(parse_json_line(line)),
        writer_stream,
    )
```

### With `deque`

```python {linenos=true}
from collections import deque
from functools import partial

deque(
    map(
        partial(dump_json, output=writer_stream),
        map(process_operations_batch, map(parse_json_line, readlines(reader_stream))),
    ),
    maxlen=0,
)
```

Read it from the inside out: `parse_json_line` on each line, `process_operations_batch` on the result, and `dump_json` at the end. The `deque(..., maxlen=0)` is the drain at the top: it accepts everything and keeps nothing.

And one important detail: `map` is lazy. On its own it does nothing, no side effect runs. There always has to be someone pulling the items, and here that someone is the `deque`.

When to use each one? Against `list(map(...))`, the `deque` always wins: it trades a throwaway list for constant memory. Against a `for`, the iteration runs in C, so it only pays off when the loop overhead weighs more than the work per item (the `map` functions still run in Python). For a simple loop body, the `for` is still more readable, and that is the form that stayed in [`capital_gains/cli.py`](https://github.com/cassiobotaro/capital-gains/blob/main/capital_gains/cli.py), from a refactoring of a technical assignment ([slides here](https://github.com/cassiobotaro/capital-gains/blob/main/slides.pdf)).

That's it, folks!

See you next time!

{}'s
