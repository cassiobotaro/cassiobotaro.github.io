+++
title = "Quando um TypedDict não cabe em uma classe"
date = "2026-09-20"
publishDate = "2026-09-20"
description = "Chaves de JSON com hífen não são identificadores Python. Veja como a sintaxe funcional de TypedDict resolve isso sem mudar o contrato da API."
slug = "typeddict-chaves-com-hifen"
tags = ["python", "dicas", "typing", "typeddict"]
categories = ["python"]
series = ["dicas-rapidas"]
+++

Em uma API, encontrei esta operação de compra:

```json
{
  "operation": "buy",
  "unit-cost": 10.00,
  "quantity": 100
}
```

Parece um JSON qualquer, até você tentar tipar essa entrada com `TypedDict`.

Repare na chave `unit-cost`.

## O problema

Normalmente um `TypedDict` é declarado como uma classe, e cada chave vira um atributo.

```python
class RawOperation(TypedDict):
    operation: Literal["buy", "sell"]
    # e agora?
    unit-cost: float
    quantity: int
# SyntaxError: illegal target for annotation
# para o Python, unit-cost parece uma subtração entre unit e cost
```

O código nem chega ao mypy, ele para antes disso.

A primeira vontade é trocar o hífen por sublinhado. Mas `unit_cost` não é a chave que veio da API.

Inventar outro nome só faz o tipo mentir sobre o dado que ele representa.

## A solução

`TypedDict` também aceita uma sintaxe funcional. Nela os campos ficam em um dicionário comum e podem ter qualquer nome que o JSON aceite.

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

Pronto. O editor entende `raw["unit-cost"]`, o _type checker_ sabe que ali vem um `float` e ninguém precisa adivinhar qual nome a API usa.

É o que a [documentação](https://docs.python.org/3/library/typing.html#typing.TypedDict) recomenda para chaves com hífen e para nomes que não podem virar atributos.

## E dentro da aplicação?

Eu deixo esse tipo perto da leitura do JSON e logo depois converto para um objeto do domínio.

```python
import json


def parse_json_line(line: str) -> list[Operation]:
    raw_ops_list: list[RawOperation] = json.loads(line)
    # Operation é o dataclass do domínio, não um TypedDict
    return [
        Operation(
            operation=raw["operation"],
            unit_cost=Money(str(raw["unit-cost"])),
            quantity=raw["quantity"],
        )
        for raw in raw_ops_list
    ]
```

O hífen fica no contrato externo, onde ele pertence, e o resto do código só conhece `unit_cost`.

E se a API mandar `"operation": "transfer"`?

O mypy continua feliz, ele acredita no `Literal` que eu escrevi. Na hora de rodar, o `match` lá no cálculo do imposto cai no `assert_never`.

```bash
AssertionError: Expected code to be unreachable, but got: 'transfer'
```

Quebrou longe de onde o dado entrou. `TypedDict` descreve o que eu espero receber, conferir se foi isso que chegou é outro trabalho.

## De onde veio o exemplo

O exemplo veio do [`capital-gains`](https://github.com/cassiobotaro/capital-gains), uma CLI que calcula imposto sobre operações de renda variável. O `Money` é o do artigo ["O Objeto Dinheiro"](/posts/objeto-dinheiro/).

Então é isso, pessoal!

Até a próxima!

{}'s
