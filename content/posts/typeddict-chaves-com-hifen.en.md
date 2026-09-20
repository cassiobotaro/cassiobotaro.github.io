+++
title = "When a TypedDict does not fit in a class"
date = "2026-09-20"
publishDate = "2026-09-20"
description = "JSON keys with a hyphen are not valid Python identifiers. See how the functional syntax of TypedDict solves that without changing the API contract."
slug = "typeddict-keys-with-hyphen"
tags = ["python", "tips", "typing", "typeddict"]
categories = ["python"]
series = ["quick-tips"]
+++

In an API, I ran into this buy operation:

```json
{
  "operation": "buy",
  "unit-cost": 10.00,
  "quantity": 100
}
```

It looks like any other JSON, until you try to type that input with `TypedDict`.

Take a look at the `unit-cost` key.

## The problem

A `TypedDict` is usually declared as a class, and every key becomes an attribute.

```python
class RawOperation(TypedDict):
    operation: Literal["buy", "sell"]
    # and now?
    unit-cost: float
    quantity: int
# SyntaxError: illegal target for annotation
# to Python, unit-cost looks like a subtraction between unit and cost
```

The code never reaches mypy, it stops before that.

The first instinct is to swap the hyphen for an underscore. But `unit_cost` is not the key that came from the API.

Making up another name only makes the type lie about the data it represents.

## The solution

`TypedDict` also accepts a functional syntax. In it the fields live in a plain dictionary and can have any name the JSON accepts.

```python
from typing import Literal, TypedDict

RawOperation = TypedDict(
    "RawOperation",
    {
        "operation": Literal["buy", "sell"],
        "unit-cost": float,
        "quantity": int,
    },
)
```

There you go. The editor understands `raw["unit-cost"]`, the type checker knows a `float` shows up there and nobody has to guess which name the API uses.

That is what the [documentation](https://docs.python.org/3/library/typing.html#typing.TypedDict) recommends for keys with a hyphen and for names that cannot become attributes.

## And inside the application?

I keep this type close to where the JSON is read, and right after that I convert it into a domain object.

```python
import json


def parse_json_line(line: str) -> list[Operation]:
    raw_ops_list: list[RawOperation] = json.loads(line)
    # Operation is the domain dataclass, not a TypedDict
    return [
        Operation(
            operation=raw["operation"],
            unit_cost=Money(str(raw["unit-cost"])),
            quantity=raw["quantity"],
        )
        for raw in raw_ops_list
    ]
```

The hyphen stays in the external contract, where it belongs, and the rest of the code only knows `unit_cost`.

And what if the API sends `"operation": "transfer"`?

mypy stays happy, it believes the `Literal` I wrote. At run time, the `match` over in the tax calculation falls into `assert_never`.

```bash
AssertionError: Expected code to be unreachable, but got: 'transfer'
```

It broke far from where the data came in. `TypedDict` describes what I expect to receive, checking that this is what actually arrived is another job.

## Where the example came from

The example came from [`capital-gains`](https://github.com/cassiobotaro/capital-gains), a CLI that calculates taxes on stock market operations. The `Money` is the one from the article ["The Money Object"](/en/posts/the-money-object/).

That's it, folks!

See you next time!

{}'s
