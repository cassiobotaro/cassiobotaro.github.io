+++
title = "Objetos totalmente comparáveis com um único método"
date = "2026-07-01"
publishDate = "2026-07-01"
description = "Com dataclass e o decorador total_ordering, basta escrever __lt__ para o objeto ganhar <, <=, >, >=, == e !=."
slug = "objetos-comparaveis"
tags = ["python", "dicas", "dataclass"]
categories = ["python"]
series = ["dicas-rapidas"]
+++

## O problema

Para um objeto responder a `<`, `<=`, `>`, `>=`, `==` e `!=`, o Python espera que você implemente `__lt__`, `__le__`, `__gt__`, `__ge__`, `__eq__` e `__ne__`. São seis métodos quase idênticos, tediosos de escrever e fáceis de deixar inconsistentes (um diz que `a < b` e outro discorda).

## A dica

Duas peças cobrem tudo:

- O `dataclass` já gera o `__eq__`, comparando todos os campos do objeto.
- O decorador `functools.total_ordering` deriva `__le__`, `__gt__` e `__ge__` a partir do `__eq__` e de **um** método de ordem.

Ou seja, você escreve só o `__lt__` e ganha o conjunto completo.

### Código

```python {linenos=true}
from dataclasses import dataclass
from decimal import Decimal
from functools import total_ordering


@dataclass(frozen=True)
@total_ordering
class Money:
    amount: Decimal
    currency: str = "BRL"

    def __lt__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount < other.amount
```

O `isinstance` evita comparar `Money` com tipos alheios: retornar `NotImplemented` deixa o outro lado tentar. Com isso, ordenar uma lista de preços com `sorted()` passa a funcionar de graça.

## De onde veio o exemplo

A classe `Money` é a mesma do artigo ["O Objeto Dinheiro"](/posts/objeto-dinheiro/), vinda do [`capital_gains/money.py`](https://github.com/cassiobotaro/capital-gains/blob/main/capital_gains/money.py), uma refatoração de teste técnico onde explorei técnicas mais avançadas de Python.

Então é isso, pessoal!

Até a próxima!

{}'s
