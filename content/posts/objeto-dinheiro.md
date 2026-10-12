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

Ponto flutuante e dinheiro não combinam. Além disso, um número sozinho não carrega informação sobre a moeda. Nada impede você de somar reais com dólares, e esse é o tipo de bug silencioso que aparece em produção.

A ideia central do padrão Money é tratar dinheiro como um objeto completo: com valor, moeda e regras próprias de aritmética. Vamos construí-lo passo a passo.

## A Base: Dataclass Congelada

Começamos definindo a estrutura com `dataclass`. Usamos `frozen=True` para tornar o objeto imutável, assim como no mundo real, onde uma quantia de dinheiro não muda: quando você paga R$ 10,00 e recebe R$ 3,00 de troco, surgem valores novos, o original continua o mesmo.

```python
from dataclasses import dataclass
from decimal import Decimal

TWOPLACES = Decimal("0.01")
DEFAULT_CURRENCY = "BRL"

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = DEFAULT_CURRENCY
```

Dois campos: `amount` guarda o valor e `currency` guarda a moeda, com `"BRL"` como padrão.

Repare que `amount` só aceita `Decimal`. Nada de `float`, nada de string. Uma versão anterior deste objeto aceitava os dois e convertia por dentro com `Decimal(valor)`, o que parece conveniente. Mas veja o que acontece com um `float`:

```python
>>> from decimal import Decimal
>>> Decimal(2.675)
Decimal('2.67499999999999982236431605997495353221893310546875')

>>> Decimal("2.675")
Decimal('2.675')
```

O `float` já chegou errado, e nenhum arredondamento depois disso conserta: `2.674999...` vira `2.67`, enquanto `2.675` vira `2.68`. Obrigando quem chama a escrever `Decimal("2.675")`, a precisão fica explícita no ponto em que o valor entra no sistema. Se o valor veio de um JSON, por exemplo, converter a string para `Decimal` é trabalho de quem leu o JSON, não do `Money`.

## Garantindo Duas Casas Decimais

O método `__post_init__` é chamado automaticamente pelo `dataclass` logo após o `__init__`. É ali que arredondamos o valor:

```python
def __post_init__(self):
    object.__setattr__(self, "amount", self.amount.quantize(TWOPLACES))
```

Vamos entender o que acontece:

1. `.quantize(TWOPLACES)` arredonda para exatamente duas casas decimais. A constante `TWOPLACES` vale `Decimal("0.01")`, que serve como molde: "quero a mesma precisão que 0.01".
2. `object.__setattr__(...)` é necessário porque o dataclass é `frozen`. Em um dataclass congelado, atribuições diretas como `self.amount = valor` levantam um `FrozenInstanceError`. O truque é chamar o `__setattr__` da classe base `object`, que ignora essa proteção. Isso é seguro aqui porque estamos dentro da inicialização.

Veja o resultado:

```python
>>> Money(Decimal("10.5"))
Money(amount=Decimal('10.50'), currency='BRL')

>>> Money(Decimal(1))
Money(amount=Decimal('1.00'), currency='BRL')

>>> Money(Decimal("9.999"))
Money(amount=Decimal('10.00'), currency='BRL')
```

Independente de quantas casas o `Decimal` trouxer, o `amount` sempre terá duas.

Lembrando que o `quantize` usa o arredondamento padrão do `Decimal`, o chamado arredondamento do banqueiro: um empate exato como `10.025` vira `10.02`, e não `10.03`, porque desempata para o algarismo par. Se o seu domínio pedir outro comportamento, basta passar `rounding=` para o `quantize`.

## Moeda: Evitando Operações Inválidas

O campo `currency` não é apenas informativo, ele serve como uma trava de segurança. Antes de qualquer operação entre dois objetos `Money`, verificamos se as moedas são iguais:

```python
def _assert_same_currency_as(self, other):
    if self.currency != other.currency:
        raise ValueError(
            f"Different currencies: {self.currency} and {other.currency}"
        )
```

Esse método é privado (prefixo `_`) porque é um detalhe interno, quem usa o `Money` não precisa chamá-lo diretamente. Ele será usado dentro das operações aritméticas e de comparação.

Se alguém tentar somar moedas diferentes, o erro é claro e imediato:

```python
>>> Money(Decimal("10.00"), "BRL") + Money(Decimal("5.00"), "USD")
ValueError: Different currencies: BRL and USD
```

Sem esse tipo de validação, o código somaria os valores silenciosamente e o bug só apareceria lá na frente.

## Sobrecarga de Operadores Aritméticos

Python permite que objetos definam como se comportam com operadores como `+`, `-`, `*` e `/`. Para isso, basta implementar os métodos especiais correspondentes.

Para **soma e subtração**, operamos entre dois objetos `Money`. Primeiro conferimos se o outro lado é mesmo um `Money`, depois se a moeda é a mesma:

```python
def __add__(self, other):
    if not isinstance(other, Money):
        return NotImplemented

    self._assert_same_currency_as(other)
    return Money(self.amount + other.amount, self.currency)

def __sub__(self, other):
    if not isinstance(other, Money):
        return NotImplemented

    self._assert_same_currency_as(other)
    return Money(self.amount - other.amount, self.currency)
```

Retornar `NotImplemented` é a forma do Python dizer "não sei fazer essa operação". O interpretador então tenta o outro lado e, se ninguém souber, levanta um `TypeError`:

```python
>>> Money(Decimal("10.00")) + 10
TypeError: unsupported operand type(s) for +: 'Money' and 'int'
```

Sem essa checagem, o erro seria um `AttributeError` reclamando que `int` não tem `currency`, bem menos claro sobre o que deu errado.

Negar um valor também entra na conta, por exemplo para transformar um prejuízo em um número positivo. Basta o `__neg__`:

```python
def __neg__(self):
    return Money(-self.amount, self.currency)
```

Para **multiplicação e divisão**, a operação é entre `Money` e um escalar. Faz sentido multiplicar um preço por uma quantidade, mas não faz sentido multiplicar um preço por outro preço. E, pelo mesmo motivo da seção anterior, escalar aqui é `int` ou `Decimal`, nunca `float`:

```python
SCALAR_TYPES = (int, Decimal)

def __mul__(self, scalar):
    if not isinstance(scalar, SCALAR_TYPES):
        return NotImplemented

    return Money(self.amount * scalar, self.currency)

__rmul__ = __mul__

def __truediv__(self, scalar):
    if not isinstance(scalar, SCALAR_TYPES):
        return NotImplemented

    return Money(self.amount / scalar, self.currency)
```

O `__rmul__` merece uma explicação. Quando escrevemos `Money(Decimal("10.00")) * 3`, o Python chama `Money.__mul__(3)`. Mas quando invertemos para `3 * Money(Decimal("10.00"))`, o Python primeiro tenta `int.__mul__(Money(...))`, que não sabe lidar com `Money` e retorna `NotImplemented`. Então o Python tenta o lado direito: `Money.__rmul__(3)`. Sem o `__rmul__`, essa expressão falharia. Como a multiplicação é comutativa, basta apontar `__rmul__` para o mesmo método.

Note que cada operação retorna um **novo** objeto `Money`, nenhuma operação altera o objeto original, mantendo a imutabilidade.

```python
>>> Money(Decimal("10.00")) + Money(Decimal("5.50"))
Money(amount=Decimal('15.50'), currency='BRL')

>>> Money(Decimal("100.00")) - Money(Decimal("30.00"))
Money(amount=Decimal('70.00'), currency='BRL')

>>> -Money(Decimal("10.00"))
Money(amount=Decimal('-10.00'), currency='BRL')

>>> Money(Decimal("25.00")) * 3
Money(amount=Decimal('75.00'), currency='BRL')

>>> 2 * Money(Decimal("15.00"))
Money(amount=Decimal('30.00'), currency='BRL')

>>> Money(Decimal("100.00")) / 3
Money(amount=Decimal('33.33'), currency='BRL')

>>> Money(Decimal("10.00")) * 0.5
TypeError: unsupported operand type(s) for *: 'Money' and 'float'

>>> Money(Decimal("10.00")) * Decimal("0.5")
Money(amount=Decimal('5.00'), currency='BRL')
```

## Comparação Completa com total_ordering

Para ordenar uma lista de preços ou verificar se um valor é maior que outro, nosso objeto precisa ser **comparável**. Em Python, isso significa implementar métodos como `__eq__` (igual), `__lt__` (menor que), `__le__` (menor ou igual), `__gt__` (maior que) e `__ge__` (maior ou igual). São cinco métodos, e implementar todos na mão é tedioso e propenso a erros.

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

A verificação `isinstance` garante que só comparamos `Money` com `Money`. Se alguém tentar `Money(Decimal("10.00")) < 42`, retornamos `NotImplemented`, o mesmo protocolo que usamos na aritmética, permitindo que o outro lado tente.

O decorador `@total_ordering` completa o trabalho: a partir do `__eq__` (do dataclass) e do `__lt__` (nosso), ele **gera automaticamente** os métodos `__le__`, `__gt__` e `__ge__`. Com duas peças, montamos o quebra-cabeça inteiro:

```python
>>> Money(Decimal("10.00")) == Money(Decimal("10.00"))
True

>>> Money(Decimal("10.00")) < Money(Decimal("20.00"))
True

>>> Money(Decimal("20.00")) >= Money(Decimal("15.00"))
True

>>> Money(Decimal("5.00")) != Money(Decimal("5.00"), "USD")
True
```

O objeto `Money` agora é **totalmente ordenável**, podendo inclusive ser usado em listas com `sort()` e `sorted()`.

## Construtor Alternativo: Zero

Em muitas situações, precisamos de um valor zero como ponto de partida: em acumuladores, como valor inicial em reduções, ou simplesmente para representar "nenhum valor". Um método de classe oferece uma forma expressiva de criar esse objeto:

```python
@classmethod
def zero(cls, currency=DEFAULT_CURRENCY):
    return cls(Decimal("0.00"), currency)
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
>>> precos = [Money(Decimal("10.00")), Money(Decimal("20.00")), Money(Decimal("30.00"))]
>>> reduce(lambda a, b: a + b, precos, Money.zero())
Money(amount=Decimal('60.00'), currency='BRL')
```

Sem o `Money.zero()`, teríamos que escrever `Money(Decimal("0.00"))` toda vez. Funciona, mas `Money.zero()` comunica melhor a intenção.

## O Código Completo

Aqui está o objeto `Money` na íntegra:

```python
from dataclasses import dataclass
from decimal import Decimal
from functools import total_ordering

TWOPLACES = Decimal("0.01")
DEFAULT_CURRENCY = "BRL"

type Scalar = int | Decimal
SCALAR_TYPES = (int, Decimal)


@dataclass(frozen=True)
@total_ordering
class Money:
    amount: Decimal
    currency: str = DEFAULT_CURRENCY

    def __post_init__(self) -> None:
        object.__setattr__(self, "amount", self.amount.quantize(TWOPLACES))

    def _assert_same_currency_as(self, other: Money) -> None:
        if self.currency != other.currency:
            raise ValueError(
                f"Different currencies: {self.currency} and {other.currency}"
            )

    def __add__(self, other: Money) -> Money:
        if not isinstance(other, Money):
            return NotImplemented

        self._assert_same_currency_as(other)
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: Money) -> Money:
        if not isinstance(other, Money):
            return NotImplemented

        self._assert_same_currency_as(other)
        return Money(self.amount - other.amount, self.currency)

    def __neg__(self) -> Money:
        return Money(-self.amount, self.currency)

    def __mul__(self, scalar: Scalar) -> Money:
        if not isinstance(scalar, SCALAR_TYPES):
            return NotImplemented

        return Money(self.amount * scalar, self.currency)

    __rmul__ = __mul__

    def __truediv__(self, scalar: Scalar) -> Money:
        if not isinstance(scalar, SCALAR_TYPES):
            return NotImplemented

        return Money(self.amount / scalar, self.currency)

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented

        self._assert_same_currency_as(other)
        return self.amount < other.amount

    @classmethod
    def zero(cls, currency: str = DEFAULT_CURRENCY) -> Money:
        return cls(Decimal("0.00"), currency)
```

## Considerações Finais

O padrão Money é um ótimo exemplo de *Value Object*, um objeto definido pelo seu valor, não pela sua identidade. Ao encapsular regras de arredondamento, validação de moeda e operações aritméticas em um único lugar, o código que lida com dinheiro fica mais expressivo e seguro.

Neste artigo, vimos como Python nos oferece ferramentas que se encaixam perfeitamente nesse padrão:

- **`dataclass`** para gerar o construtor, o `__repr__` e o `__eq__` automaticamente.
- **`__post_init__`** para arredondar o valor antes de guardá-lo, mesmo com o dataclass congelado.
- **Métodos especiais** (`__add__`, `__sub__`, `__neg__`, `__mul__`, `__truediv__`) para uma interface natural com operadores, e `NotImplemented` para recusar operandos que não fazem sentido.
- **`@total_ordering`** combinado com o `__eq__` do dataclass e um único `__lt__` para tornar o objeto totalmente comparável.
- **`@classmethod`** para construtores alternativos expressivos como `Money.zero()`.

Às vezes, não passar em um teste técnico é só o começo do aprendizado.

Então é isso, pessoal!

Até a próxima!

{}'s
