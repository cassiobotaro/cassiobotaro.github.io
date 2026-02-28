+++
title = "O Objeto Dinheiro"
date = "2026-02-28"
description = "Implementando o padrão Money de Martin Fowler em Python com dataclasses."
slug = "objeto-dinheiro"
tags = ["python", "dicas", "dataclass", "patterns"]
categories = ["python"]
+++

![Dinheiro](/images/dinheiro.png)

## A História

Há um tempo, participei de um processo seletivo de um banco roxinho bastante conhecido. Não passei, mas recebi um feedback valioso sobre o código que escrevi. Juntando esse feedback com conhecimentos que adquiri depois, decidi revisitar o desafio e melhorar a implementação. Uma das melhorias mais significativas foi a criação de um objeto `Money`, baseado no padrão de mesmo nome descrito por Martin Fowler no livro *Patterns of Enterprise Application Architecture* (PeAA).

A ideia central é simples: dinheiro não é apenas um número. Dinheiro tem moeda, regras de arredondamento e não faz sentido somar reais com dólares. Vamos construir esse objeto passo a passo.

## A Base: Dataclass Congelada

Começamos definindo a estrutura básica com `dataclass`. Usamos `frozen=True` para tornar o objeto imutável, afinal, uma quantia de dinheiro não muda — você cria uma nova.

```python
from dataclasses import dataclass, field, InitVar
from decimal import Decimal

TWOPLACES = Decimal("0.01")
DEFAULT_CURRENCY = "BRL"

@dataclass(frozen=True)
class Money:
    raw_amount: InitVar[Decimal | float | str]
    amount: Decimal = field(init=False)
    currency: str = DEFAULT_CURRENCY
```

Repare no uso de `InitVar` e `field(init=False)`. O campo `raw_amount` é um parâmetro de inicialização que **não** será armazenado como atributo do objeto. Ele existe apenas para receber o valor bruto. Já o campo `amount` não aparece no `__init__` gerado pelo dataclass — ele será calculado no `__post_init__`.

## Garantindo Duas Casas Decimais

O `__post_init__` recebe os campos marcados como `InitVar` e nos permite processar o valor antes de armazená-lo:

```python
def __post_init__(self, raw_amount):
    quantized_amount = Decimal(raw_amount).quantize(TWOPLACES)
    object.__setattr__(self, "amount", quantized_amount)
```

Aqui convertemos o valor para `Decimal` e usamos `quantize` para garantir sempre duas casas decimais. Como o dataclass é `frozen`, não podemos atribuir diretamente ao atributo, então usamos `object.__setattr__` para contornar essa restrição durante a inicialização.

```python
>>> Money("10.5")
Money(amount=Decimal('10.50'), currency='BRL')

>>> Money(1)
Money(amount=Decimal('1.00'), currency='BRL')

>>> Money("9.999")
Money(amount=Decimal('10.00'), currency='BRL')
```

## Moeda: Evitando Operações Erradas

O campo `currency` existe para impedir que operações sem sentido aconteçam. Antes de qualquer operação entre dois objetos `Money`, verificamos se as moedas são compatíveis:

```python
def _assert_same_currency_as(self, other):
    if self.currency != other.currency:
        raise ValueError(
            f"Different currencies: {self.currency} and {other.currency}"
        )
```

Isso garante que você nunca some reais com dólares acidentalmente:

```python
>>> Money("10.00", "BRL") + Money("5.00", "USD")
ValueError: Different currencies: BRL and USD
```

## Sobrecarga de Operadores Aritméticos

Com os métodos especiais do Python, podemos fazer operações aritméticas de forma natural:

```python
def __add__(self, other):
    self._assert_same_currency_as(other)
    return Money(self.amount + other.amount, self.currency)

def __sub__(self, other):
    self._assert_same_currency_as(other)
    return Money(self.amount - other.amount, self.currency)

def __mul__(self, scalar):
    return Money(self.amount * Decimal(scalar), self.currency)

__rmul__ = __mul__

def __truediv__(self, scalar):
    return Money(self.amount / Decimal(scalar), self.currency)
```

Soma e subtração exigem verificação de moeda. Multiplicação e divisão operam com escalares (inteiros ou decimais), não com outro `Money` — faz sentido multiplicar um preço por uma quantidade, mas não multiplicar um preço por outro preço.

O `__rmul__` permite escrever `3 * Money("10.00")` além de `Money("10.00") * 3`.

```python
>>> Money("10.00") + Money("5.50")
Money(amount=Decimal('15.50'), currency='BRL')

>>> Money("100.00") - Money("30.00")
Money(amount=Decimal('70.00'), currency='BRL')

>>> Money("25.00") * 3
Money(amount=Decimal('75.00'), currency='BRL')

>>> 2 * Money("15.00")
Money(amount=Decimal('30.00'), currency='BRL')

>>> Money("100.00") / 3
Money(amount=Decimal('33.33'), currency='BRL')
```

## Comparação Completa com total_ordering

Aqui está a grande jogada. O `dataclass` já gera automaticamente o método `__eq__` que compara todos os campos. Então, dois objetos `Money` são iguais se tiverem o mesmo `amount` e a mesma `currency`. Só precisamos implementar o `__lt__` (menor que):

```python
from functools import total_ordering

@dataclass(frozen=True)
@total_ordering
class Money:
    ...

    def __lt__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        self._assert_same_currency_as(other)
        return self.amount < other.amount
```

O decorador `@total_ordering` faz a mágica: a partir do `__eq__` (que já temos de graça pelo dataclass) e do `__lt__`, ele gera automaticamente `__le__`, `__gt__` e `__ge__`. Com isso, o objeto `Money` se torna **totalmente comparável**:

```python
>>> Money("10.00") == Money("10.00")
True

>>> Money("10.00") < Money("20.00")
True

>>> Money("20.00") >= Money("15.00")
True

>>> Money("5.00") != Money("5.00", "USD")
True
```

## Construtor Alternativo: Zero

Por fim, um método de classe que cria um `Money` com valor zero. Muito útil como valor inicial em acumuladores e reduções:

```python
@classmethod
def zero(cls, currency=DEFAULT_CURRENCY):
    return cls("0.00", currency)
```

```python
>>> Money.zero()
Money(amount=Decimal('0.00'), currency='BRL')

>>> Money.zero("USD")
Money(amount=Decimal('0.00'), currency='USD')

>>> from functools import reduce
>>> precos = [Money("10.00"), Money("20.00"), Money("30.00")]
>>> reduce(lambda a, b: a + b, precos, Money.zero())
Money(amount=Decimal('60.00'), currency='BRL')
```

## O Código Completo

Aqui está o objeto `Money` na íntegra:

```python
from collections.abc import Sequence
from dataclasses import InitVar, dataclass, field
from decimal import Decimal
from functools import total_ordering

TWOPLACES = Decimal("0.01")
DEFAULT_CURRENCY = "BRL"

type Scalar = int | Decimal
type DecimalConvertible = Decimal | float | str | tuple[int, Sequence[int], int]


@dataclass(frozen=True)
@total_ordering
class Money:
    raw_amount: InitVar[DecimalConvertible]
    amount: Decimal = field(init=False)
    currency: str = DEFAULT_CURRENCY

    def __post_init__(self, raw_amount: DecimalConvertible) -> None:
        quantized_amount = Decimal(raw_amount).quantize(TWOPLACES)
        object.__setattr__(self, "amount", quantized_amount)

    def _assert_same_currency_as(self, other: Money) -> None:
        if self.currency != other.currency:
            raise ValueError(
                f"Different currencies: {self.currency} and {other.currency}"
            )

    def __add__(self, other: Money) -> Money:
        self._assert_same_currency_as(other)
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: Money) -> Money:
        self._assert_same_currency_as(other)
        return Money(self.amount - other.amount, self.currency)

    def __mul__(self, scalar: Scalar) -> Money:
        return Money(self.amount * Decimal(scalar), self.currency)

    __rmul__ = __mul__

    def __truediv__(self, scalar: Scalar) -> Money:
        return Money(self.amount / Decimal(scalar), self.currency)

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented

        self._assert_same_currency_as(other)
        return self.amount < other.amount

    @classmethod
    def zero(cls, currency: str = DEFAULT_CURRENCY) -> Money:
        return cls("0.00", currency)
```

## Considerações Finais

O padrão Money é um ótimo exemplo de como um *Value Object* bem modelado pode prevenir uma série de bugs sutis. Ao encapsular regras de arredondamento, validação de moeda e operações aritméticas em um único lugar, o código que utiliza dinheiro fica mais expressivo e seguro.

Python nos dá ferramentas poderosas para isso: `dataclass` para reduzir boilerplate, `InitVar` e `__post_init__` para controle de inicialização, `total_ordering` para comparação completa com esforço mínimo, e os métodos especiais para uma interface natural com operadores.

Às vezes, não passar em um teste técnico é só o começo do aprendizado.

Então é isso pessoal!

Até a próxima!

{}'s
