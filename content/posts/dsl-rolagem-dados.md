+++
title = "Quando Python Encontra RPG: Rolando Dados com Estilo"
date = "2026-02-01"
description = "Criando uma Domain Specific Language amigável para rolagem de dados de RPG usando sobrecarga de operadores em Python."
tags = ["python", "dsl", "rpg", "oop"]
categories = ["rivendell"]
slug = "dsl-rolagem-dados"
+++

![Pessoas jogando RPG](/images/rpg.png "Pessoas jogando RPG")

## Vamos rolar os dados?

Imagine poder escrever rolagens de dados de RPG de forma natural como:

```python
3 * D6 + 2 * D10
```

E executar uma rolagem simplesmente com:

```python
(3 * D10 + 1 * D4).roll()
```

Isso é possível em Python através da sobrecarga de operadores! Vamos criar uma DSL (Domain Specific Language - Linguagem Específica de Domínio) para tornar a rolagem de dados intuitiva e expressiva.

## Um Pouco de Contexto

Na minha adolescência, fui mestre de RPG e me divertia muito jogando Vampiro: A Máscara e Tagmar. Recentemente, ao fazer um curso online de Smalltalk, deparei-me com um exemplo similar de DSL para rolagem de dados. Achei a ideia brilhante e decidi implementar em Python! Foi muito divertido explorar como a sobrecarga de operadores pode criar uma interface tão natural e expressiva.

## A Implementação

Vamos começar pela classe `Die` (Dado):

```python
import random


class Die:
    def __init__(self, faces=6):
        super().__init__()
        self.faces = faces

    def roll(self):
        return random.randint(1, self.faces)

    @classmethod
    def with_faces(cls, an_integer):
        return cls(an_integer)

    def __repr__(self):
        return f"Die({self.faces})"
```

### Parâmetros Opcionais no Construtor

Note que, apesar de termos um método `with_faces` que funciona como construtor alternativo, **Python possui parâmetros opcionais no construtor com valores padrão**. No nosso caso, `faces=6` define que, se não especificarmos o número de faces, o dado terá 6 faces por padrão (como um dado comum). Isso torna a classe mais flexível e pythônica!

Você pode criar um dado assim:

```python
d6 = Die()        # Dado de 6 faces (padrão)
d20 = Die(20)     # Dado de 20 faces
d10 = Die.with_faces(10)  # Usando o construtor alternativo
```

### A Mágica da Sobrecarga de Operadores

Agora vem a parte mais interessante - a classe `DieHandle` que permite combinar dados usando operadores matemáticos:

```python
class DieHandle:
    def __init__(self):
        self.dice = []

    def add_die(self, a_die):
        self.dice.append(a_die)

    def dice_number(self):
        return len(self.dice)

    def roll(self):
        return sum(die.roll() for die in self.dice)

    def max_value(self):
        return sum(die.faces for die in self.dice)

    def __add__(self, other):
        if not isinstance(other, DieHandle):
            return NotImplemented

        new_handle = DieHandle()
        for die in self.dice:
            new_handle.add_die(die)

        for die in other.dice:
            new_handle.add_die(die)

        return new_handle

    def __mul__(self, other):
        if not isinstance(other, int):
            return NotImplemented

        new_handle = DieHandle()
        for _ in range(other):
            for die in self.dice:
                new_handle.add_die(die)

        return new_handle

    __rmul__ = __mul__
```

A sobrecarga ocorre através dos métodos especiais:

- `__add__`: Permite usar o operador `+` para combinar grupos de dados
- `__mul__`: Permite usar `*` para multiplicar dados (ex: `3 * D6` cria três dados de 6 faces)
- `__rmul__`: Permite a multiplicação reversa, fazendo `3 * D6` funcionar (não apenas `D6 * 3`)

Note que retornamos `NotImplemented` quando o operando não é do tipo esperado, permitindo que Python tente outros métodos ou lance um erro apropriado.

### Criando Atalhos Convenientes

Para facilitar ainda mais, criamos uma função auxiliar e constantes pré-definidas:

```python
def D(a_number):
    handle = DieHandle()
    handle.add_die(Die.with_faces(a_number))
    return handle


D10 = D(10)
D12 = D(12)
D20 = D(20)
D4 = D(4)
D6 = D(6)
D8 = D(8)
```

## Usando a DSL

Agora podemos escrever expressões naturais para rolagem de dados:

```python
# Rolando 3 dados de 6 faces
resultado = (3 * D6).roll()

# Combinando diferentes tipos de dados
ataque = (2 * D20 + 1 * D4).roll()

# Verificando o valor máximo possível
dano_max = (3 * D10 + 1 * D4).max_value()  # 34

# Verificando quantos dados temos
qtd_dados = (3 * D6 + 2 * D10).dice_number()  # 5
```

## Conclusão

A sobrecarga de operadores em Python permite criar DSLs elegantes e expressivas. Neste caso, transformamos operações matemáticas simples em uma interface intuitiva para rolagem de dados de RPG.

O código não apenas funciona bem, mas também lê de forma natural, quase como linguagem humana. Esse exercício, inspirado pelo curso de Smalltalk, mostra como conceitos de diferentes linguagens podem ser adaptados e enriquecer nossa forma de programar em Python!

Então é isso pessoal!

Até a próxima!

{}'s
