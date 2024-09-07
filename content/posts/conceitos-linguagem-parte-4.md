+++
title = "Conceitos de linguagem de programação - Parte 4"
date = "2015-12-14"
description = "Conceitos de linguagens de programação aplicados em Python"
tags = ["python3", "iniciantes", "python"]
categories = ["python"]
slug = "conceitos-linguagem-parte-4"
+++

![logo-python](/images/logopython2.png "Logo Python")

## Introdução

Este post está relacionado a uma palestra ministrada no XVI encontro da comunidade mineira de Python, e aqui foi divida em partes para evitar que fique massante e cansativa.

Cada parte será postada em uma semana.

Existe um [repositório](https://github.com/cassiobotaro/conceitos_linguagens) onde exemplifico tudo que for colocado aqui além de explicar mais detalhadamente como e por que as coisas acontecem.

A parte 4 pode ser encontrada [aqui](http://cassiobotaro.github.io/conceitos-linguagem-parte-4).

## Paradigmas

Como segundo assunto falaremos sobre paradigmas de programação.

### Programação Imperativa

Paradigma principal do Python, tem por característica mudança de estado do programa.

O nome imperativo e por causa que ordens são dadas no imperativo.

Basicamente um programa é escrito como:
faça isto, faça aquilo, depois aquilo outro.

Exemplo de um programa imperativo:

```python

somente_menores_que_1 = []

for x in (0.1, 0.3, 2.5, 0.8, 1.1, 0.1):
    if x < 1:
        somente_menores_que_1.append(x)
quadrado_valores = []

for y in somente_menores_que_1:
    quadrado_valores.append(y)

print(quadrado_valores)

```

Repare que a mudança do programa são refletidas e armazenadas em células de memória(variáveis).

### Programação Funcional

Características funcionais

- Provê map e filter, funções uteis quando se trabalha funcionalmente

- Funções lambdas

- Funções de primeira ordem (veja as lambdas sendo passados como parâmetros de outras funções)

```python

map(lambda x: x ** 2, filter(lambda x: x < 1, (0.1, 0.3, 2.5, 0.8, 1.1, 0.1)))

```

Restrições

- não existe recursão em cauda

- não é puramente funcional, logo não apresenta todas as suas características

### Orientação a objeto

Não considerado por Sebesta como um paradigma de programação, O argumento é que toda programação orientada a objeto é imperativa, com única diferença que a estruturação dos arquivos é orientada a objetos.

Características:

- Elegância em getters e setters com utilização de properties
- Herança Múltipla
- Utilização do self explícito em métodos de instância

Exemplo da utilização:

```python

class Filho(Pai, Mae):

    def __init__(self, nome, peso):
        self.nome = nome
        self.peso = peso

    @property
    def peso(self):
        return self.__peso

    @peso.setter
    def peso(self, valor):
        if valor > 0:
            self.__peso = valor
        else:
            raise ValueError('valor deve ser > 0')
```

Python possui suporte a orientação a objetos, inclusive até mesmo os tipos básicos em python são objetos.

A conclusão é que Python é imperativo, mas também possui caraterísticas de outros paradigmas e suporte a orientação a objeto.

### Gostinho de queiro mais?

Este assunto é melhor explicado na prática, então não perca tempo e veja [este arquivo](https://github.com/cassiobotaro/conceitos_linguagens/blob/master/paradigmas.py).

Caso algo não esteja devidamente explicado, por favor reporte abrindo uma issue que farei o aprimoramento da explicação.

Então é isso pessoal!

Até a próxima!

{}'s
