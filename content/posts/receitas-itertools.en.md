+++
title = "The recipes hidden in the itertools documentation"
date = "2026-07-13"
publishDate = "2026-07-13"
description = "The itertools documentation ships a collection of ready-made recipes: flatten, first_true, sliding_window and other useful functions that do not come with the module."
slug = "itertools-recipes"
tags = ["python", "tips", "iterators"]
categories = ["python"]
series = ["quick-tips"]
+++

At the end of the `itertools` page there is a section called [Itertools Recipes](https://docs.python.org/3/library/itertools.html#itertools-recipes): a collection of useful functions built by combining the module's building blocks. Flattening a list of lists, finding the first element that passes a test, walking a sequence in windows: a lot of what you would write by hand is already solved there. The recipes do not come ready to use in `itertools`, the idea is to copy them into your code. We have already used one of them here, `consume`, in the article about [consuming iterables without allocating memory](/en/posts/consuming-iterables/). I picked three others that are worth knowing.

`flatten` flattens one level of nested lists:

```python
from itertools import chain

def flatten(list_of_lists):
    return chain.from_iterable(list_of_lists)

list(flatten([[1, 2], [3, 4], [5]]))  # [1, 2, 3, 4, 5]
```

`first_true` returns the first element that satisfies a condition, without scanning the rest:

```python
def first_true(iterable, default=False, predicate=None):
    return next(filter(predicate, iterable), default)

first_true([2, 4, 7, 8], predicate=lambda x: x % 2)  # 7
```

`sliding_window` walks the sequence in sliding windows:

```python
from collections import deque
from itertools import islice

def sliding_window(iterable, n):
    iterator = iter(iterable)
    window = deque(islice(iterator, n - 1), maxlen=n)
    for x in iterator:
        window.append(x)
        yield tuple(window)

list(sliding_window("ABCDE", 3))  # [('A','B','C'), ('B','C','D'), ('C','D','E')]
```

Some recipes were such a hit that they became part of the module, like `pairwise` and `batched`. And if you prefer everything ready and tested, the [more-itertools](https://pypi.org/project/more-itertools/) package brings these and many others.

That's it, folks!

See you next time!

{}'s
