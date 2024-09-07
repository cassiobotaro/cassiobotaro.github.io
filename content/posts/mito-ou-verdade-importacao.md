+++
title = "Mito ou Verdade = Importação"
date = "2015-06-11"
description = "Importação dentro de função é uma otimização. Verdade ou mito?"
tags = ["python", "mito", "verdade"]
categories = ["python"]
slug = "mito-ou-verdade-importacao"
+++

![mythbusters](/images/MythBusters-Logo.jpg)

## O problema

Vamos supor que temos uma função em um determinado módulo que precisa de utilizar de recursos de outro módulo.

Mas este outro modulo pode importar outros módulos que possivelmente não serão utilizados.

Será que a solução é fazer as importações internamente nas funções para que o carregamento seja feito de forma preguiçosa?

Esta economia de recursos é uma otimização?

## Discussão sobre o problema

Vamos iniciar com um módulo A (moduloa.py):

```python
# coding: utf-8
from modulob import funcaoteste
import sys


def funcao():
    '''Chama função de modulo B'''
    return funcaoteste(1, 2)

print('math' in sys.modules)
```

e em um módulo B (modulob.py):

```python
# coding: utf-8
import math
import os
import sys


def funcaoteste(a, b):
    return math.sin((a ** b) * 3)
# mais código...
```

Quando executamos a função funcao, além de trazermos funcaoteste ao _namespace_ corrente, um cache é feito para os outros módulos importados por modulob.

Agora vamos modificar o modulob para um segunda versão:

```python
# coding: utf-8
import os
import sys


def funcaoteste(a, b):
    import math
    return math.sin((a ** b) * 3)
# mais código...
```

Caso rode o modulo A novamente veremos que agora math não está nos módulos até que a função seja chamada.

Para visualizar a mudança modifique modulo A para conter o seguinte código:

```python
...
print('math' in sys.modules)
funcao()
print('math' in sys.modules)
```

Repare que somente após a chamada da função o cache do módulo math é realizado.

Porém, ao fazer isto estamos aumentando o tempo de execução da função pois a chamada a instrução de importação será executada a cada vez que função for chamada(embora o interpretador já terá compilado o módulo e responderá a chamada instantaneamente).

Em um programa que preocupação é performance esta execução pode ser prejudicial.

Para vê-la vamos analisar o bytecode das funções:

import dis
dis.dis(funcaoteste)

funcaoteste versão 1:

```bash
  8           0 LOAD_GLOBAL              0 (math)
              3 LOAD_ATTR                1 (sin)
              6 LOAD_FAST                0 (a)
              9 LOAD_FAST                1 (b)
             12 BINARY_POWER
             13 LOAD_CONST               1 (3)
             16 BINARY_MULTIPLY
             17 CALL_FUNCTION            1
             20 RETURN_VALUE
```

funcaoteste versão2:

```bash
  7           0 LOAD_CONST               1 (-1)
              3 LOAD_CONST               0 (None)
              6 IMPORT_NAME              0 (math)
              9 STORE_FAST               2 (math)

  8          12 LOAD_FAST                2 (math)
             15 LOAD_ATTR                1 (sin)
             18 LOAD_FAST                0 (a)
             21 LOAD_FAST                1 (b)
             24 BINARY_POWER
             25 LOAD_CONST               2 (3)
             28 BINARY_MULTIPLY
             29 CALL_FUNCTION            1
             32 RETURN_VALUE
```

Aqui veremos uma diferença no bytecode gerado e isto reflete na execução, quando executado os programas apresentam leve diferença de tempo, sendo menor na primeira abordagem.

A pep 8 também recomenda a importação no início do arquivo, isto ajuda na legibilidade do código.

## Vamos Pensar

Como import math está dentro da função, seu código somente será executado quando a função for chamada, ou seja estou atrasando o carregamento do módulo e com isso ganhamos na inicialização do módulo. Certo? Trazer estes módulos não podem prejudicar memória?

Não está errado, realmente com a segunda abordagem, caso a função não seja chamada, a compilação do módulo não ocorre e fica delegado a cada função o carregamento do módulo. Mas isto pode trazer consigo alguns problemas como replicação de código.

Esta preocupação com a memória não é justificável, pois se analisarmos eu não trouxe math para meu _namespace_, apensa deixei o modulo em cache.

## Quando realizar importação dentro da função?

Tenho alguns motivos para fazer isto como para evitar colisão de nomes em um _namespace_, deixar em escopo local algum modulo ou se este módulo importado é raramente utilizado.

Porém isto deve ser pensado cautelosamente.

## Conclusão

Essa otimização pode ter até casos pontuais em que se aplica, mas na maioria das vezes é uma má pratica.

Logo, Mito foi derrubado!

![busted](/images/busted.jpg)

Então é isso pessoal!

Até a próxima!

{}'s
