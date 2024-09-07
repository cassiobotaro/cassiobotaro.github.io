+++
title = "Conceitos de linguagem de programação - Parte 3"
date = "2015-12-06"
description = "Conceitos de linguagens de programação aplicados em Python"
tags = ["python3", "iniciantes", "python"]
categories = ["python"]
slug = "conceitos-linguagem-parte-3"
+++

![logo-python](/images/logopython2.png "Logo Python")

## Introdução

Este post está relacionado a uma palestra ministrada no XVI encontro da comunidade mineira de Python, e aqui foi divida em partes para evitar que fique massante e cansativa.

Cada parte será postada em uma semana.

Existe um [repositório](https://github.com/cassiobotaro/conceitos_linguagens) onde exemplifico tudo que for colocado aqui além de explicar mais detalhadamente como e por que as coisas acontecem.

A parte 2 pode ser encontrada [aqui](/post/conceitos-linguagem-parte-2).

## Sobrecargas

Como segundo assunto falaremos sobre sobrecargas de operadores e métodos.

### Sobrecarga de operadores

Tudo é objeto em python, como tal, quando eu utilizo um operador sobre qualquer coisa, na verdade estou invocando o "dunder" método correspondente
àquele operador.

Ex:

```python
a = 4
print(a + 4)
# é o mesmo que
print(a.__add__(4))
```

Quando falamos em sobrecarga de método, significa modificar estas funções especiais que o interpretador utiliza, para prover um comportamento diferente.

Normalmente respondendo a tipos diferentes com valores diferentes.

Por exemplo as strings em python são sobrecarregadas, quando diantes do operador de multiplicaçao '\*' e o oerando é um inteiro, ele realiza a replicação do valor e sua eventual concatenação.

```python
print('3'* 3)
# 333
```

### Sobrecarga de métodos

Um mesmo método, responde de diferentes maneiras de acordo com a sua assinatura.
Por exemplo, um método se comporta de uma maneira quando recebe uma string e de outra, quando recebe uma instância de Objeto qualquer.

```python
search('Patriots') # invoca um método

search(['Patriots', 'NFL', 'Futebol Americano']) # outro método é invocado
```

No python isto é feito através de singledispatch da biblioteca functools. Há uma função(dispatcher) que invoca a função correspondente de acordo com o tipo do parâmetro recebido.

Post curto neh?

Foi proposital, este assunto é melhor explicado na prática, então não perca tempo e veja [este arquivo](https://github.com/cassiobotaro/conceitos_linguagens/blob/master/sobrecargas.py).

[Clique aqui](/post/conceitos-linguagem-parte-4) para ir até a parte 4.

Caso algo não esteja devidamente explicado, por favor reporte abrindo uma issue que farei o aprimoramento da explicação.

Então é isso pessoal!

Até a próxima!

{}'s
