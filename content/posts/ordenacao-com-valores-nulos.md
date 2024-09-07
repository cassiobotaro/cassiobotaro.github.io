+++
title = "Ordenação com valores nulos"
date = "2016-07-21"
description = "Ordene uma lista de valores, colocando os valores nulos no fim."
tags = ["dicas", "ordenação", "iniciantes"]
categories = ["python"]
slug = "ordenacao-com-valores-nulos"
+++

![ordenacao](/images/sort.jpg "Ordenação")

Dado uma lista de elementos de mesmo tipo e valores nulos, ordene-os considerando que elementos nulos devem ir para o fim da lista.

Por exemplo:

```python

# Considere uma lista com valores inteiros e nulos
lista1 = [2, 1, None, 6, None, 3]

# A ordenação correta seria
assert lista1 == [1, 2, 3, 6, None, None]

# Considere também uma lista de strings
lista2 = ['d', 'a', None, None, 'f', 'b']

# A ordenação correta seria
assert lista2 == [1, 2, 3, 6, None, None]

# O mesmo problema aparece em lista de dicionários ou objetos
lista3 = [{'nome': 'João'}, {'nome': None}, {'nome': 'Carla'}]

# A ordenação correta seria
assert lista3 == [{'nome': 'Carla'}, {'nome': 'João'}, {'nome': None}]
```

## Discussão sobre o problema

A lista possui um método para ordenação que se chama `sort`. Sua assinatura nos permite ordenar qualquer tipo de objeto, desde que este seja iterável e seus elementos sejam comparáveis.

Mas o que significa ser comparável? Em termos práticos, significa que se eu comparar um elemento com o adjacente da lista eu consigo obter um resultado booleano. Em termos mais técnicos, eu possuo implementado o _dunder_ método utilizado na comparação para o tipo do elemento adjacente.

```python
(3 > 2) is True

('a' > 'z') is False
```

Ordenar uma lista de inteiros ou strings, é simples como `lista.sort()`. Porém o problema induz elementos nulos na lista e quando o método _sort_ tenta comparar um elemento e nulo, uma exceção _TypeError_ é lançada. A mensagem nos diz o problema: " unorderable types: int() > NoneType() ".

```
>>> 3 > None
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
TypeError: unorderable types: int() > NoneType()
```

O método sort, possui o parâmetro key, que por padrão assume o valor None. Este parâmetro é um callable(por exemplo uma função) que durante a ordenação irá receber como parâmetro um elemento e retorna um valor que deve ser utilizado para a comparação.

```python
# define uma lista de listas
lista = [[], [1, 2, 3], [1, 2]]

# ordena considerando o tamanho de cada lista
lista.sort(key=len)

# A ordenação correta seria
assert lista == [[], [1, 2], [1, 2, 3]]

# Para uma lista de dicionários
lista = [{'nome': 'João'}, {'nome': 'Maria'}, {'nome': 'Carla'}]

# uma chave poderia ser utilizada pra ordenar.
lista.sort(key=lambda dict_: dict_['nome'])

# resultaria em
assert lista == [{'nome': 'Carla'}, {'nome': 'João'}, {'nome': 'Maria'}]
```

Uma possível solução para nosso problema é conferir através da função que será utilizada em key, se o valor for nulo(None) e caso seja retorna o maior valor possível.

```python
# Para uma lista de inteiros por exemplo poderiamos fazer:
lista1.sort(key=lambda x: x or 9999)

# Mas isto faria surgir uma constante aleatória no código e isto não é legal.
```

## A solução

A melhor solução é através de uma tupla. Quando comparada, o primeiro elemento é comparado ao primeiro da outra tupla, caso sejam valores similares, o segundo valor é comparado e assim por diante.

```python
# para uma lista de inteiro ou string:
lista.sort(key=lambda elemento: (elemento is None, elemento))

# para uma lista de dicionário
lista.sort(key=lambda dict_: (dict_['key'] is None, dict_['key']))
```

A solução é simples e elegante, lembrando que False pode ser entendido como 0 e True como 1, logo se o elemnto for None, o primeiro elemento da tupla será True e irá ser ordenado ao fim da lista.

Então é isso pessoal!

Até a próxima!

{}'s
