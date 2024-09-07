+++
title = "Ordenando dicionário por valores"
date = "2019-03-23"
description = "Dado um dicionário, como ordená-lo utilizando os valores."
tags = ["python"]
categories = ["rivendell"]
slug = "ordenando-dicionario-por-valores"
+++

![dict](/images/dict.png "associação de chaves e valores")

Dado um dicionário, eu quero ordenar seus elementos de acordo com seus valores, não por sua chave.

Por exemplo o dicionário `{1: "b", 2: "a"}` se torna `{2: "a", 1: "b"}` pois "a" < "b" .

## Discussão

Executar a função sorted sobre um dicionário tem como resultado uma lista ordenada de suas chaves.

A explicação disso é que a função sorted recebe um objeto iterável, ou seja uma estrutura de dados container que pode ter seus elementos internos percorridos múltiplas vezes e retorna uma nova lista ordenada de forma ascendente.

O comportamento padrão de um dicionário quando percorrido é retornar os valores de suas chaves.

```python
for value in {1: "b", 2: "a"}:
    print(value)
```

Porém dicionários possuem o método `items` que retorna uma estrutura percorrível, com o valor de suas chaves e seus valores associados.

```python
for tupla_chave_valor in {1: "b", 2: "a"}:
    print(tupla_chave_valor)
```

Essa estrutura se assemelha a uma lista de tuplas, em que cada tupla possui dois valores, a chave e o valor associado aquela chave.

`dict_items([(1, "b"), (2, "a")])`

Porém ainda que eu tenha os dois valores, ainda tenho um problema que é "como ordenar essa lista?".

O método sorted, ordena os elementos de forma ascendente, e no nosso caso, quando eu comparo as tuplas, o primeiro valor é levado em conta e somente caso ocorra uma igualdade segundo valor será utilizado.

Porém o método aceita um parâmetro chamado key, que é uma função aplicada a cada elemento antes da comparação.

Se eu defino por exemplo a função `len` como key em um método sort, os elementos serão ordenados pelo tamanho.

```python
>>> sorted(["12", "123", "1"], key=len)
["1", "12", "123"]
```

Para conseguir ordenar nossa lista de tuplas pelo segundo elemento vamos recorrer a uma função do módulo `operator`.

O método em questão será o `itemgetter`, ele recebe como parâmetro uma ou mais posições que serão retornadas em um iterável.

```python
from operator import itemgetter
original = {1: 2, 2: 3, 3: 1}
print(sorted(original.items(), key=itemgetter(1))))
```

Estamos quase lá, mas agora temos uma lista, mas não um dicionário.

Temos uma nova lista de tuplas ordenadas `[(3, 1), (1, 2), (2, 3)]`.

Podemos fazer a conversão desta lista em um dicionário `dict([(3, 1), (1, 2), (2, 3)])`

## Conclusão

O código final se torna:

```python
from operator import itemgetter
original = {1: 2, 2: 3, 3: 1}
ordered = dict(sorted(original.items(), key=itemgetter(1)))
print(ordered)
```

Lembrando que esta solução é somente válida para versões acima da 3.6, anteriores a isto devem utilizar `OrderedDict` no lugar de dict.

Então é isso pessoal!

Até a próxima!

{}'s
