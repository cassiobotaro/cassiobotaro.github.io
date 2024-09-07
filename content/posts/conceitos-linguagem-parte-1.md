+++
title = "Conceitos de linguagem de programação - Parte 1"
date = "2015-11-22"
description = "Conceitos de linguagens de programação aplicados em Python"
tags = ["python3", "iniciantes", "python"]
categories = ["python"]
slug = "conceitos-linguagem-parte-1"
+++

![logo-python](/images/logopython2.png "Logo Python")

## Introdução

Este post está relacionado a uma palestra ministrada no XVI encontro da comunidade mineira de Python, e aqui foi divida em partes para evitar que fique massante e cansativa.

Cada parte será postada em uma semana.

Existe um [repositório](https://github.com/cassiobotaro/conceitos_linguagens) onde exemplifico tudo que for colocado aqui além de explicar mais detalhadamente como e por que as coisas acontecem.

Durante a faculdade eu aprendi uma disciplina chamada linguagens de programação, e nela não se aprende nenhuma linguagem específica, mas sim os conceitos que são aplicados em todas elas.

Veremos abaixo sobre alguns conceitos e como eles são aplicados em Python.

## Tipagem

O primeiro assunto a ser tratado será tipagem.

### Tipagem estática ou dinâmica

Python possui tipagem dinâmica, sua vinculação de tipos ocorre em tempo de execução, por isso é possível mudar o tipo de uma variável em tempo de execução.

### Tipagem forte ou fraca?

Python embora tenha uma vinculação de tipo em tempo de execução, ou seja dinâmica, ele possui uma tipagem forte. Não há muita conversão de tipos quando se refere a operações, como por exemplo soma.

### Tipos primitivos

Em Python não possuímos tipos primitivos, tudo é objeto.
Possuímos tipos builtins, tipos básicos que já estão disponíveis, como por exemplos listas, tuplas, números complexos, etc.

### Conversão/coerção de tipos

Por possuir tipagem forte não há muita coerção de tipos, embora os tipos numéricos apresentam coerção.

A conversão de tipos, quando possível é realizada através de uma "função" com nome semelhante ao tipo escolhido. Por exemplo str(1), para converter um número em string.

### Comparação e outros operadores

A comparação entre elementos não é permitida(tipagem forte) a menos que dois elementos se permitam comparação. Uma consideração deve ser feita a comparação que apresenta como resultado False.

### Ponteiros

Não existe o tipo ponteiro, mas tudo tem a ver com ponteiros. Entenda a atribuição de uma variável como um rótulo a um endereço de memória, associado a um escopo (assunto para outro _post_) e este endereço de memória pode ser compartilhado.

Inclusive Python costuma utilizar desta técnica para economizar o uso de memória.

Para saber mais a respeito destes tópicos consulte [este arquivo](https://github.com/cassiobotaro/conceitos_linguagens/blob/master/tipagem.py)

Caso algo não esteja devidamente explicado, por favor reporte abrindo uma _issue_ que farei o aprimoramento da explicação.

[Clique aqui](/post/conceitos-linguagem-parte-2) para ir até a parte 2.

Então é isso pessoal!

Até a próxima!

{}'s
