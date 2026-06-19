+++
title = "O Objeto Dinheiro"
date = "2026-03-01"
description = "Implementando o padrão Money em Python com dataclasses."
slug = "objeto-dinheiro"
tags = ["python", "dicas", "dataclass", "patterns"]
categories = ["python"]
+++

![Dinheiro](/images/dinheiro.png)

## A História

Há um tempo, participei de um processo seletivo de um banco roxinho bastante conhecido. Não passei, mas recebi um feedback valioso sobre o código que escrevi. Juntando esse feedback com conhecimentos que adquiri depois, decidi revisitar o desafio e melhorar a implementação.

Uma das melhorias mais significativas foi a criação de um objeto `Money`, baseado no padrão de mesmo nome descrito por Martin Fowler no livro *Patterns of Enterprise Application Architecture* (PEAA).

## O Problema

Quando representamos dinheiro como um simples número, coisas estranhas podem acontecer:

```python
>>> 0.1 + 0.2
0.30000000000000004

>>> preco = 19.99
>>> preco * 3
59.970000000000006
```

Ponto flutuante e dinheiro não combinam. Além disso, um número sozinho não carrega informação sobre a moeda. Nada impede você de somar reais com dólares — e esse é o tipo de bug silencioso que aparece em produção.

A ideia central do padrão Money é tratar dinheiro como um objeto completo: com valor, moeda e regras próprias de aritmética. Vamos construí-lo passo a passo.

## A Base: Dataclass Congelada

Começamos definindo a estrutura com `dataclass`. Usamos `frozen=True` para tornar o objeto imutável — assim como no mundo real, uma quantia de dinheiro não muda: quando você paga R$ 10,00 e recebe R$ 3,00 de troco, surgem valores novos, o original continua o mesmo.

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

Aqui temos três campos, mas cada um tem um papel diferente:

- **`raw_amount`** está marcado com `InitVar`. Isso significa que ele é um parâmetro do construtor, mas **não** vira um atributo do objeto. Ele só existe para receber o valor bruto na hora da criação.
- **`amount`** usa `field(init=False)`, ou seja, **não** aparece no construtor. Ele será calculado internamente — veremos como a seguir.
- **`currency`** é um campo normal com valor padrão `"BRL"`.

Essa separação entre o que o usuário passa (`raw_amount`) e o que o objeto armazena (`amount`) é o que nos permite processar o valor antes de guardá-lo.

## Garantindo Duas Casas Decimais

O método `__post_init__` é chamado automaticamente pelo `dataclass` logo após o `__init__`. Ele recebe como argumento os campos marcados com `InitVar` — no nosso caso, o `raw_amount`:

```python
def __post_init__(self, raw_amount):
    quantized_amount = Decimal(raw_amount).quantize(TWOPLACES)
    object.__setattr__(self, "amount", quantized_amount)
```

Vamos entender linha a linha:

1. `Decimal(raw_amount)` converte o valor bruto para `Decimal`, que é o tipo ideal para trabalhar com valores monetários (sem os problemas de ponto flutuante).
2. `.quantize(TWOPLACES)` arredonda para exatamente duas casas decimais. A constante `TWOPLACES` vale `Decimal("0.01")`, que serve como molde — "quero a mesma precisão que 0.01".
3. `object.__setattr__(...)` é necessário porque o dataclass é `frozen`. Em um dataclass congelado, atribuições diretas como `self.amount = valor` levantam um `FrozenInstanceError`. O truque é chamar o `__setattr__` da classe base `object`, que ignora essa proteção. Isso é seguro aqui porque estamos dentro da inicialização.

Veja o resultado:

```python
>>> Money("10.5")
Money(amount=Decimal('10.50'), currency='BRL')

>>> Money(1)
Money(amount=Decimal('1.00'), currency='BRL')

>>> Money("9.999")
Money(amount=Decimal('10.00'), currency='BRL')
```

Independente do que é passado, o `amount` sempre terá duas casas decimais.

## Moeda: Evitando Operações Inválidas

O campo `currency` não é apenas informativo — ele serve como uma trava de segurança. Antes de qualquer operação entre dois objetos `Money`, verificamos se as moedas são iguais:

```python
def _assert_same_currency_as(self, other):
    if self.currency != other.currency:
        raise ValueError(
            f"Different currencies: {self.currency} and {other.currency}"
        )
```

Esse método é privado (prefixo `_`) porque é um detalhe interno — quem usa o `Money` não precisa chamá-lo diretamente. Ele será usado dentro das operações aritméticas e de comparação.

Se alguém tentar somar moedas diferentes, o erro é claro e imediato:

```python
>>> Money("10.00", "BRL") + Money("5.00", "USD")
ValueError: Different currencies: BRL and USD
```

Sem esse tipo de validação, o código somaria os valores silenciosamente e o bug só apareceria lá na frente.

## Sobrecarga de Operadores Aritméticos

Python permite que objetos definam como se comportam com operadores como `+`, `-`, `*` e `/`. Para isso, basta implementar os métodos especiais correspondentes.

Para **soma e subtração**, operamos entre dois objetos `Money` e verificamos a moeda antes:

```python
def __add__(self, other):
    self._assert_same_currency_as(other)
    return Money(self.amount + other.amount, self.currency)

def __sub__(self, other):
    self._assert_same_currency_as(other)
    return Money(self.amount - other.amount, self.currency)
```

Para **multiplicação e divisão**, a operação é entre `Money` e um escalar (um número inteiro ou decimal). Faz sentido multiplicar um preço por uma quantidade, mas não faz sentido multiplicar um preço por outro preço:

```python
def __mul__(self, scalar):
    return Money(self.amount * Decimal(scalar), self.currency)

__rmul__ = __mul__

def __truediv__(self, scalar):
    return Money(self.amount / Decimal(scalar), self.currency)
```

O `__rmul__` merece uma explicação. Quando escrevemos `Money("10.00") * 3`, o Python chama `Money.__mul__(3)`. Mas quando invertemos para `3 * Money("10.00")`, o Python primeiro tenta `int.__mul__(Money(...))`, que não sabe lidar com `Money` e retorna `NotImplemented`. Então o Python tenta o lado direito: `Money.__rmul__(3)`. Sem o `__rmul__`, essa expressão falharia. Como a multiplicação é comutativa, basta apontar `__rmul__` para o mesmo método.

Note que cada operação retorna um **novo** objeto `Money` — nenhuma operação altera o objeto original, mantendo a imutabilidade.

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

Para ordenar uma lista de preços ou verificar se um valor é maior que outro, nosso objeto precisa ser **comparável**. Em Python, isso significa implementar métodos como `__eq__` (igual), `__lt__` (menor que), `__le__` (menor ou igual), `__gt__` (maior que) e `__ge__` (maior ou igual). São cinco métodos — e implementar todos na mão é tedioso e propenso a erros.

Aqui está a grande jogada: o `dataclass` já gera automaticamente o `__eq__`, que compara todos os campos do objeto. Dois objetos `Money` são iguais se tiverem o mesmo `amount` **e** a mesma `currency`. Isso já vem de graça.

Precisamos implementar apenas o `__lt__`:

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

A verificação `isinstance` garante que só comparamos `Money` com `Money`. Se alguém tentar `Money("10.00") < 42`, retornamos `NotImplemented` — que é a forma do Python dizer "não sei fazer essa comparação", permitindo que o outro lado tente.

O decorador `@total_ordering` completa o trabalho: a partir do `__eq__` (do dataclass) e do `__lt__` (nosso), ele **gera automaticamente** os métodos `__le__`, `__gt__` e `__ge__`. Com duas peças, montamos o quebra-cabeça inteiro:

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

O objeto `Money` agora é **totalmente ordenável**, podendo inclusive ser usado em listas com `sort()` e `sorted()`.

## Construtor Alternativo: Zero

Em muitas situações, precisamos de um valor zero como ponto de partida — em acumuladores, como valor inicial em reduções, ou simplesmente para representar "nenhum valor". Um método de classe oferece uma forma expressiva de criar esse objeto:

```python
@classmethod
def zero(cls, currency=DEFAULT_CURRENCY):
    return cls("0.00", currency)
```

Usamos `cls` em vez de `Money` diretamente para que o método funcione corretamente mesmo em subclasses. Veja como fica na prática:

```python
>>> Money.zero()
Money(amount=Decimal('0.00'), currency='BRL')

>>> Money.zero("USD")
Money(amount=Decimal('0.00'), currency='USD')
```

Um uso muito comum é como valor inicial em uma redução. Imagine somar uma lista de preços:

```python
>>> from functools import reduce
>>> precos = [Money("10.00"), Money("20.00"), Money("30.00")]
>>> reduce(lambda a, b: a + b, precos, Money.zero())
Money(amount=Decimal('60.00'), currency='BRL')
```

Sem o `Money.zero()`, teríamos que escrever `Money("0.00")` — funciona, mas `Money.zero()` comunica melhor a intenção.

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

O padrão Money é um ótimo exemplo de *Value Object* — um objeto definido pelo seu valor, não pela sua identidade. Ao encapsular regras de arredondamento, validação de moeda e operações aritméticas em um único lugar, o código que lida com dinheiro fica mais expressivo e seguro.

Neste artigo, vimos como Python nos oferece ferramentas que se encaixam perfeitamente nesse padrão:

- **`dataclass`** para gerar o construtor, o `__repr__` e o `__eq__` automaticamente.
- **`InitVar`** e **`__post_init__`** para processar valores de entrada antes de armazená-los.
- **Métodos especiais** (`__add__`, `__sub__`, `__mul__`, `__truediv__`) para uma interface natural com operadores.
- **`@total_ordering`** combinado com o `__eq__` do dataclass e um único `__lt__` para tornar o objeto totalmente comparável.
- **`@classmethod`** para construtores alternativos expressivos como `Money.zero()`.

Às vezes, não passar em um teste técnico é só o começo do aprendizado.

Então é isso, pessoal!

Até a próxima!

{}'s
