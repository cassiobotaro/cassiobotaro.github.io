+++
title = "Hexagonal architecture in a single file"
date = "2026-08-09"
publishDate = "2026-08-09"
description = "The ports and adapters pattern has only two sides, the inside and the outside. It says nothing about folder structure."
slug = "hexagonal-architecture-single-file"
tags = ["architecture", "python", "patterns", "hexagonal"]
categories = ["software-engineering"]
+++

![Hexagonal architecture](/images/hexagonal.png "Ports and adapters")

Every time someone brings up hexagonal architecture, a diagram with fifteen folders shows up, `domain`, `application`, `infrastructure`, and the conversation turns into where to put files. The pattern is not that.

I spent a while studying the subject to put together a [talk](https://canva.link/233m7mdrtzzc2c5) (in Portuguese), and the two code examples here came straight from it.

> 💡 The pattern is Alistair Cockburn's. The quotes throughout come from his original article and his book.

## Getting on the same page: the adapter pattern

Half of the pattern's name is adapter. It is one of the classics from [Design Patterns](https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612), the Gang of Four crowd: convert the interface of a class into the interface another one expects. Think of a plug adapter: the appliance does not change, the wall does not change, the little piece in the middle gets the two talking.

Hold on to that image, because the hexagon is that same piece repeated all around the application.

## There are only two sides

> Ports & Adapters has only two layers: the inside (the app), and the outside (everything else).

The pattern draws a single line, between the inside and the outside. Application layer, domain layer, infrastructure layer: splitting the inside that way is your call, not a requirement of the hexagon.

Every conversation crosses a port, and whatever translates a technology into that port is an adapter. Cockburn warns that a port is not a class: it is the point of interaction defined by the app for external actors. And it is born of purpose:

> Their shift in design was to architect the system's interfaces by purpose rather than by technology, and to have the technologies be substitutable (on all sides) by adapters.

He recommends that the function names at a port be technology neutral, named for the business purpose of the interactions: `tax_rate` and not `select_rate_from_postgres`.

The test is straightforward:

> if the database is moved from a SQL database to a flat file or any other kind of database, the conversation across the API should not change.

## The example

```python
class TaxCalculator:
    def __init__(self, tax_rate_repository):
        self.tax_rate_repository = tax_rate_repository

    def tax_on(self, amount):
        return amount * self.tax_rate_repository.tax_rate(amount)


class FixedTaxRateRepository:
    def tax_rate(self, amount):
        return 0.15


tax_rate_repository = FixedTaxRateRepository()
my_calculator = TaxCalculator(tax_rate_repository)
print(my_calculator.tax_on(100))  # Outputs: 15.0
```

`TaxCalculator` has no idea where the rate comes from. Whoever wires the application up decides that. Swapping `FixedTaxRateRepository` for one that reads from Postgres does not touch the calculation.

> This pattern is so simple: Just put an API all around your app or system and pass in an argument to set up each secondary connection. Nothing more.

## It is not about folders

The book has a whole section on how to organize the inside, and it is basically a shrug:

> That is totally up to you. "Not my job," as they say. You can make a functional or object-oriented design. You can make a modular monolith or a big ball of mud. You can use "clean architecture", domain-driven design, or anything that suits you. The pattern says exactly nothing on this topic.

The same hexagon, with no classes at all, in a single file:

```python
def tax_on(tax_rate):
    def calculate_tax(amount):
        return amount * tax_rate(amount)

    return calculate_tax


def fixed_tax_rate(amount):
    return 0.15


tax_on(fixed_tax_rate)(100)  # Outputs: 15.0
```

A closure does the same job: `tax_rate` is the port, `fixed_tax_rate` is the adapter.

> Remember, in Ports & Adapters you are free to organize the inside of the app in any way you like, and the things outside the app in any way you like.

## What about the interface?

In both examples above nobody declared an interface. That bothers people coming from Java, and the book addresses it:

> The folder structure is not covered by the pattern, nor is it the same in all languages. Some languages (Java), require interface definitions. Some (Python, Ruby) don't. And some, such as Smalltalk, don't even have the concept of files!

In Python that is just how it goes: the object only needs the method. If you want the contract spelled out for the type checker, use `Protocol`:

```python
from typing import Protocol


class TaxRateRepository(Protocol):
    def tax_rate(self, amount: float) -> float: ...
```

## When to use it

The pattern charges you in indirection and wiring code, so it only pays off where substituting and isolating actually matter.

It is worth considering in the core subdomain, the one that gives the business its competitive advantage. Following Vlad Khononov's advice, in [Learning Domain-Driven Design](https://www.amazon.com/Learning-Domain-Driven-Design-Aligning-Architecture/dp/1098100131), that is where the more sophisticated modelling patterns earn their keep. In a run-of-the-mill CRUD, probably not.

## Going deeper

[Alistair Cockburn's original article](https://alistair.cockburn.us/hexagonal-architecture) is the source, and the book [Hexagonal Architecture Explained](https://www.amazon.com/Hexagonal-Architecture-Explained-Alistair-Cockburn/dp/173751978X), his with Juan Manuel Garrido de Paz, is the definitive read. I recommend it a lot. To see it running, I put together [pysmallerwebhexagon](https://github.com/cassiobotaro/pysmallerwebhexagon), a Python version of Cockburn's own example.

That's it, folks!

See you next time!

{}'s
