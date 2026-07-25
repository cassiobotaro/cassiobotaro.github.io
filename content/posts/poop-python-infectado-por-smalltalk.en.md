+++
title = "POOP: Python infected by Smalltalk"
date = "2026-05-05"
description = "The story of a Python interpreter with no if, no for, no free functions, and what I learned writing it from scratch with AI as a copilot."
slug = "poop-python-infected-by-smalltalk"
tags = ["python", "smalltalk", "oop", "ai", "experience"]
categories = ["python", "oop"]
+++

![POOP](/images/poop.png "The POOP project logo")

## A provocation aimed at object orientation

There is a quote from Alan Kay that has been following me for years:

> OOP is, essentially, about message passing.

The first time I heard about it, I pretended to understand and went on writing `if` and `for` like always. But the idea would not leave my head. The final push came from Sandi Metz's talk [*Nothing is Something*](https://www.youtube.com/watch?v=OMPfEXIlTVE), where she shows how to replace `nil`, conditionals and operators with objects that respond to messages, including a `Null Object` that knows how to behave like any other. I left it with a huge urge to make a concrete provocation to Python: what if I removed everything that *looks* procedural, even when it isn't? I know that `print(x)` ends up calling `__str__` and that `len(x)` delegates to `__len__`; Python's data model is remarkably coherent in that regard. But the *look* of those calls is that of a free function, not of a message to an object. No `if`, no `for`, no `print(x)`, no `len(x)`. Everything has to *look like* a message sent to an object.

The result is **POOP** (*Python Object Oriented Programming*), an interpreter that runs Python "infected" by the Smalltalk philosophy. It is not a production project. It is a personal endeavor to open my mind about software design and see what happens when the behavior of the system emerges exclusively from communication between objects.

## What it is like to write code in POOP

The POOP pipeline is simple: `parse → validate → transform → execute`.

- **Validators** reject forbidden constructs (`if`, `for`, `print`, `len`, `not`, …).
- **Transformers** rewrite the AST before execution: every literal becomes a POOP type (`Int`, `Str`, `Boolean`, `List`, …) and every `lambda` becomes a first-class `Block`.

Some typical replacements:

| Python | POOP |
|---|---|
| `print(x)` | `x.print()` |
| `if cond: ... else: ...` | `cond.if_true_if_false(lambda: ..., lambda: ...)` |
| `for x in col:` | `col.do(lambda x: ...)` |
| `while cond:` | `(lambda: cond).while_true(lambda: ...)` |
| `not x` | `x.not_()` |
| `len(x)` | `x.len()` |
| `x[i]` | `x.at(i)` |

To get a taste of it, here is a leap year detector without a single `if`, `else` or `not`:

```python
class Year:
    def __init__(self, value):
        self._value = value

    def is_leap(self):
        return (self._value % 400 == 0).or_(
            lambda: (self._value % 4 == 0).and_(
                lambda: (self._value % 100 == 0).not_()
            )
        )


Year(2000).is_leap().print()  # true  (divisible by 400)
Year(1900).is_leap().print()  # false (divisible by 100 but not by 400)
Year(2008).is_leap().print()  # true  (divisible by 4 but not by 100)
```

Notice how `or_` and `and_` take **blocks** (`lambda`) instead of values. That preserves Python's short-circuiting (the right-hand side is only evaluated if needed), but the syntax changes the way you think about the expression. It is no longer "if this and that"; it is "this boolean, receiving the `or_` message, decides whether to run the next block".

## What I learned writing with AI as a copilot

This was my first project driven **from scratch** using AI as a copilot from the very first commit. Some of the lessons have already changed the way I work:

**1. Cognitive debt is real.**
Even while steering the AI the whole time, I noticed that some of the more sophisticated implementations (non-trivial AST transformations, especially) I only knew at the macro level. I knew what was there and why, but if you asked me to explain a specific line, I would have to reread it. That is a debt that charges interest: when it is time to change something, you pay.

**2. A bad pattern spreads at a frightening speed.**
The AI is an amplifier. If a bad pattern gets into the code, it will replicate it across every file that follows, without blinking. The countermeasure that worked for me was treating each design decision as an **explicit rule**: as soon as I notice a pattern (good or bad), I document it, update `CLAUDE.md` and go back to fix what was already wrong. The cost of not doing that is exponential.

**3. The *research → plan → implement → validate* cycle worked really well.**
Before any new line, I ask for a quick round of research: what is the trade-off, what is the precedent, what do other languages do? Then a plan. Then the implementation. And only then the validation: tests, linters (`ruff`), type checking (`ty`), pre-commit hooks. Skipping the first step, in my experience, is what generates the most rework.

**4. Every design decision goes into a file.**
In POOP, that file is called [`INFECTIONS.md`](https://github.com/cassiobotaro/poop/blob/main/INFECTIONS.md). It lists every active validator and transformer, with the *reason* behind the choice: why `not x` was banned, why `+=` was kept, why `super()` is allowed despite looking like a free function. It is not user documentation. It is long-term memory for me and for the AI.

**5. Open decisions go into the backlog.**
Everything I am not yet convinced about goes into `proposals.md`. It is a queue of "ideas that look good but need to mature". Some become infections, others die there, and that is fine.

**6. Atomic commits, always.**
Small, focused, with a clear message. When something goes wrong (and it does), a `git bisect` solves it in minutes instead of hours. In a project with AI this is especially valuable, because it makes it easy to revert one of the machine's "good ideas" without destroying the rest.

## The aesthetic criterion

There is a sentence in `INFECTIONS.md` that became the project's master criterion:

> The central criterion for an infection is not "does this exist in Smalltalk?" but "does this look like an object receiving a message?".

Operators like `-x`, `~x` and free functions like `len(x)`, `abs(x)` already are, under the hood, method calls (`__neg__`, `__invert__`, `__len__`, `__abs__`). Even `not x` gets there: since Python has no `__not__`, the operator falls back to `__bool__`. Everything is already method dispatch. What fails is the *look* of those calls, which feels procedural. In POOP, those same operations become `x.negated()`, `x.bit_invert()`, `x.len()`, `x.abs()`, `x.not_()`. The idea is that the code should **look like** a conversation between objects, not a sequence of operations.

That aesthetic criterion is what taught me the most about design. A good part of what we call "OO" in Python is, in fact, procedural syntax with classes behind it. POOP only makes that obvious once you take the crutch away.

## Worth a look?

If you like fundamentals, mind-opening provocations, or just want to see what `FizzBuzz` looks like without a single `if`, the repository is here:

👉 [github.com/cassiobotaro/poop](https://github.com/cassiobotaro/poop)

There is an `examples/` folder with `hello_world`, `fizzbuzz`, `leap_year`, `collatz` and others, each one with the Smalltalk equivalent in a comment.

And `proposals.md` gathers the ideas and changes that are still maturing. If any of them catches your eye, open an issue or a PR. Every contribution is welcome.

If you enjoy it, leave a star. 🌟

That's it, folks!

See you next time!

{}'s
