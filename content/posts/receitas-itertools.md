+++
title = "As receitas escondidas na documentação do itertools"
date = "2026-07-13"
publishDate = "2026-07-13"
description = "A documentação do itertools traz uma coleção de receitas prontas: flatten, first_true, sliding_window e outras funções úteis que não vêm no módulo."
slug = "receitas-itertools"
tags = ["python", "dicas", "iteradores"]
categories = ["python"]
series = ["dicas-rapidas"]
+++

No fim da página do `itertools` existe uma seção chamada [Itertools Recipes](https://docs.python.org/3/library/itertools.html#itertools-recipes): uma coleção de funções úteis construídas combinando os blocos do módulo. Achatar uma lista de listas, achar o primeiro elemento que passa num teste, percorrer uma sequência em janelas: muita coisa que você escreveria na mão já está resolvida ali. As receitas não vêm prontas no `itertools`, a ideia é copiar pro seu código. Já usamos uma delas por aqui, a `consume`, no artigo sobre [consumir iteráveis sem alocar memória](/posts/consumindo-iteraveis/). Separei três outras que valem a pena conhecer.

`flatten` achata um nível de listas aninhadas:

```python
from itertools import chain

def flatten(list_of_lists):
    return chain.from_iterable(list_of_lists)

list(flatten([[1, 2], [3, 4], [5]]))  # [1, 2, 3, 4, 5]
```

`first_true` devolve o primeiro elemento que satisfaz uma condição, sem varrer o resto:

```python
def first_true(iterable, default=False, predicate=None):
    return next(filter(predicate, iterable), default)

first_true([2, 4, 7, 8], predicate=lambda x: x % 2)  # 7
```

`sliding_window` percorre a sequência em janelas deslizantes:

```python
from collections import deque
from itertools import islice

def sliding_window(iterable, n):
    iterator = iter(iterable)
    window = deque(islice(iterator, n - 1), maxlen=n)
    for x in iterator:
        window.append(x)
        yield tuple(window)

list(sliding_window("ABCDE", 3))  # [('A','B','C'), ('B','C','D'), ('C','D','E')]
```

Algumas receitas fizeram tanto sucesso que viraram parte do módulo, como `pairwise` e `batched`. E se preferir tudo pronto e testado, o pacote [more-itertools](https://pypi.org/project/more-itertools/) traz essas e muitas outras.

Então é isso, pessoal!

Até a próxima!

{}'s
