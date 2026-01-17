+++
title = "Armadilha com count e index em NamedTuple"
date = "2026-01-17"
description = "Entenda por que usar campos count ou index em NamedTuple pode causar problemas com analisadores de tipos estáticos como mypy."
slug = "namedtuple-count-index-mypy"
tags = ["python", "dicas", "typing", "mypy"]
categories = ["python"]
+++

![Type checking](/images/type-checking.png)

## O Problema

Você está usando `NamedTuple` para criar suas classes de dados e decide criar um campo chamado `count` ou `index`. Tudo funciona perfeitamente em tempo de execução, mas quando você executa o mypy ou outro analisador de tipos, recebe erros estranhos. O que está acontecendo?

```python
from typing import NamedTuple

class Item(NamedTuple):
    name: str
    count: int  # Perigo!

item = Item(name="apple", count=5)
print(item.count)  # Funciona em runtime
```

Ao executar o mypy:

```bash
$ mypy exemplo.py
exemplo.py:7: error: Cannot assign to a method
exemplo.py:9: error: "int" not callable
```

## Por que isso acontece?

`NamedTuple` herda de `tuple`, e tuplas possuem métodos nativos chamados `count()` e `index()`:

```python
# Métodos nativos de tuple
numeros = (1, 2, 3, 2, 1)
numeros.count(2)  # Retorna 2 (quantas vezes 2 aparece)
numeros.index(3)  # Retorna 2 (posição do primeiro 3)
```

Quando você cria um campo com esses nomes em uma `NamedTuple`, há uma colisão de nomes. Em tempo de execução, o Python prioriza os atributos criados pela `NamedTuple`, mas os analisadores de tipos estáticos ficam confusos, pois veem tanto o método quanto o atributo com o mesmo nome.

## Demonstrando o Problema

Veja um exemplo mais completo:

```python
from typing import NamedTuple

class Estatistica(NamedTuple):
    valor: str
    count: int
    index: int

# Criação funciona
stats = Estatistica(valor="teste", count=10, index=0)

# Acesso funciona em runtime
print(f"Count: {stats.count}")  # 10
print(f"Index: {stats.index}")  # 0

# Mas mypy reclama:
# error: Cannot assign to a method
# error: "int" not callable
```

O mypy detecta o conflito porque:

1. `tuple.count` é um método que recebe um valor e retorna um inteiro
2. Você está tentando definir `count` como um atributo inteiro
3. O mesmo vale para `index`

## A Solução

Existem algumas formas de resolver este problema:

### 1. Renomear os campos (Recomendado)

A solução mais simples e clara é usar nomes diferentes:

```python
from typing import NamedTuple

class Estatistica(NamedTuple):
    valor: str
    quantidade: int  # Em vez de count
    posicao: int     # Em vez de index

stats = Estatistica(valor="teste", quantidade=10, posicao=0)
```

### 2. Usar dataclass

Se você realmente precisa desses nomes específicos, considere usar `dataclass` em vez de `NamedTuple`:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Estatistica:
    valor: str
    count: int
    index: int

stats = Estatistica(valor="teste", count=10, index=0)
# Funciona perfeitamente com mypy!
```

A desvantagem é que `dataclass` não herda de `tuple`, então você perde alguns recursos como acesso por índice e desempacotamento posicional. Por outro lado, você ganha maior flexibilidade e evita conflitos de nomes.

### 3. Usar type: ignore (Não recomendado)

Como último recurso, você pode suprimir os avisos do mypy:

```python
from typing import NamedTuple

class Estatistica(NamedTuple):
    valor: str
    count: int  # type: ignore[misc]
    index: int  # type: ignore[misc]
```

Esta abordagem não é recomendada porque você está ocultando um problema real e pode perder outros avisos importantes.

## Outros Métodos Problemáticos

Além de `count` e `index`, cuidado com outros métodos de tuple que podem causar conflitos:

```python
# Métodos de tuple que você deve evitar como nomes de campos:
# - count
# - index

# Métodos herdados de object que também podem causar problemas:
# - __class__
# - __delattr__
# - __getattribute__
# - __setattr__
```

## Considerações Finais

Este é um exemplo clássico de como a análise estática de tipos pode revelar problemas sutis que funcionam em runtime mas podem causar confusão e bugs difíceis de detectar. Sempre execute o mypy ou outro type checker no seu código para capturar esses problemas cedo!

A regra geral é: se você está usando `NamedTuple`, evite usar nomes que sejam métodos de `tuple`. Quando precisar desses nomes específicos, `dataclass` é geralmente uma escolha melhor.

Então é isso pessoal!

Até a próxima!

{}'s
