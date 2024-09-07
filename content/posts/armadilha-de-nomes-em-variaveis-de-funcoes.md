+++
title = "Armadilha de nomes em variáveis de funções"
date = "2016-08-13"
description = "Variável referenciada antes de ser atribuída? Entenda o que acontece com nomes dentro de uma função."
tags = ["python", "python3", "iniciantes"]
categories = ["python"]
slug = "ardilha-de-nomes-em-variaveis-de-funcoes"
+++

![fragile](/images/fragile.jpg "Importação Frágil")

Vamos analisar os seguintes cenários, eu tenho uma função onde ocorre uma importação dentro de uma função.

Porém temos duas coisas ocorrendo, uma é que a condicional é falsa, logo o math não vai ser importado.

Mas como já havia sido previamente importado no início do arquivo, o que esperar?

No segundo caso, temos a declaração da variável de forma global, novamente temos uma condicional onde a variavel é redefinida de forma local.

Porém como a condicional é falsa, esta não será redefinida.

Quando a execução chega no ponto onde há a chamada do método append, o que ocorre?

Será que em ambos os casos a variável global será utilizada?

```python

import math

# Importação condicional
def import_dentro_da_funcao():
    if False:
        import math
    ...
    math.sin(30)

# Atribuição condicional
variavel = []
def exemplo_variavel():
    if False:
        variavel = []
    variavel.append('erro')
```

## Discussão sobre o problema

Somos levados a acreditar que em uma função, a análise de nomes será feita primeiramente em nível local(locals()) e em seguida em nível global(globals()).

Isto nos faz pensar que ambos os casos apresentados funcionarão utilizando o escopo global.

Mas o que ocorre na verdade é um erro, e o mais interessante, somente durante a execução do programa.

```python
>>> variavel = []
>>> def exemplo_variavel():
...     if False:
...         variavel = []
...     variavel.append('erro')
...
>>> exemplo_variavel()
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "<stdin>", line 4, in exemplo_variavel
UnboundLocalError: local variable 'variavel' referenced before assignment
```
WAT!

Quando uma função é definida, o interpretador já analisa seu corpo e define o espaço de nomes locais para aquela função.

Ou seja, a função já sabe quais serão os nomes utilizados em seu escopo local.

Isto pode ser verificado da seguinte maneira:

`funcao.__code__.co_varnames`

Porém o resultado inesperado é durante a execução do programa.

No primeiro caso, ao atingir `math.sin(30)`, o interpretador espera que o nome `math` esteja referenciando algum objeto, mas dado que a condicional é falsa, durante a execução isto não ocorre e uma exceção é lançada, dizendo que a variável é referenciada antes de ter sido atribuída.

O mesmo é valido para o segundo caso, embora não se trate de uma importação, mas sim de uma variável.

## A solução

Este é um erro perigoso, pois só ocorre em tempo de execução e embora aqui apresentado de forma simplificada pode aparecer de maneiras mais complexas.

A prevenção é tentar manter a PEP8, importando sempre no topo do arquivo(salvo em raras exceções), cuidado também com a inicialização de variáveis dentro de condicionais.

Fecho este post com a lembrança do zen do python: "Special cases aren't special enough to break the rules", lembrem-se disto ao achar que seu caso é especial.

Então é isso pessoal!

Até a próxima!

{}'s
