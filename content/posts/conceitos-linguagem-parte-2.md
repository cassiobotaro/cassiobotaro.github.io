+++
title = "Conceitos de linguagem de programação - Parte 2"
date = "2015-11-29"
description = "Conceitos de linguagens de programação aplicados em Python"
tags = ["python3", "iniciantes", "python"]
categories = ["python"]
slug = "conceitos-linguagem-parte-2"
+++

![logo-python](/images/logopython2.png "Logo Python")

## Introdução

Este post está relacionado a uma palestra ministrada no XVI encontro da comunidade mineira de Python, e aqui foi divida em partes para evitar que fique massante e cansativa.

Cada parte será postada em uma semana.

Existe um [repositório](https://github.com/cassiobotaro/conceitos_linguagens) onde exemplifico tudo que for colocado aqui além de explicar mais detalhadamente como e por que as coisas acontecem.

A parte 1 pode ser encontrada [aqui](/post/conceitos-linguagem-parte-1).

## Métodos e funções

Como segundo assunto falaremos sobre coisas associadas a funções.

### Escopo

A resolução de nomes é sempre do interior(escopo local) para o exterior(escopo global) das funções a menos que explicitamente modificado.

Caso um nome seja invocado dentro de uma função, primeiro se procura dentro do escopo da funão esta variável, em seguida no escopo de quem invocou a função e assim por diante até chegar ao escopo global.

### Passagem de parâmetro por valor ou referência?

A passagem de parâmetro em python se dar por referência em Python.

Isto leva a duas considerações, quando há atribuição daquele nome a um outro
objeto, repare que isto não afeta o objeto externo.
E isto leva a um efeito colateral com objetos mutáveis como listas e dicionários.

Sua alteração dentro da função é refletida no objeto externo.

#### Namespaces

Eventualmente há uma colisão na vinculação de nomes, e a resolução disto
pelo interpretador é considerar a ultima atribuição ou importação daquele nome.
Para solucionar isto, a utilização de namespaces é importante.
Por exemplo a função open é builtin do Python, ou seja já vem por padrão no escopo global, mas caso eu quero utilizar a open do modulo io eu devo fazer utilização de namespaces.

Exemplo:

```python
import io

io.open(...)
```

### Métodos anônimos

Pode ser definida basicamente como: "Dado uma entrada, me retorne uma saída."
São funções que não possuem nome, sua representação é através da palavra reservada lambda.

Exemplo: Função que retorna o cubo de um número

```python
lambda x: x**3
```

A função deixa de existir quando não há mais referências a ela.

### Closure

Closure é o registro de uma função associado a variáveis livre dentro
de um contexto léxico em funções de primeira classe.
Exemplo:

```python
def makeInk(x):
    def inc(y):
        return x + y
    return inc
```

A variável x está associada a função inc, em um contexto léxico.

closure1 = makeInk(1)

closure2 = makeInk(5)

Seu valor na closure 1 é 1 e na segunda é 5.

Se o conceito ainda soar estranho, não se apavore, este conceito de alterar
uma função em tempo de execução é dado como meta programação e não é
considerado um assunto simples.

Para saber mais a respeito destes tópicos consulte [este arquivo](https://github.com/cassiobotaro/conceitos_linguagens/blob/master/metodos.py).

Caso algo não esteja devidamente explicado, por favor reporte abrindo uma issue que farei o aprimoramento da explicação.

[Clique aqui](/post/conceitos-linguagem-parte-3) para ir até a parte 3.

Então é isso pessoal!

Até a próxima!

{}'s
