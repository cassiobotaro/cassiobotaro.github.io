+++
title = "Consumindo iteráveis sem alocar memória"
date = "2026-06-17"
publishDate = "2026-06-17"
description = "Consuma iteráveis pelos efeitos colaterais com deque(..., maxlen=0): sem lista intermediária e com loop em C."
slug = "consumindo-iteraveis"
tags = ["python", "dicas", "iteradores"]
categories = ["python"]
series = ["dicas-rapidas"]
+++

## O problema

Quando você só quer "rodar" um pipeline de `map`/gerador pelos efeitos colaterais (escrever cada item num stream, por exemplo), o reflexo é um `for` ou um `list(...)`. O `list` aloca uma lista inteira que vai ser descartada na sequência, gastando memória à toa. O `for` resolve a memória, mas o loop roda em Python puro.

## A dica

`collections.deque` aceita o parâmetro `maxlen`. Com `maxlen=0`, ela puxa cada elemento e descarta na hora, sem nunca crescer: é a receita [`consume`](https://docs.python.org/3/library/itertools.html#itertools-recipes) do `itertools`. Em vez de materializar uma lista só para jogá-la fora, você esgota o pipeline em memória constante.

O padrão é sempre `deque(map(...), maxlen=0)`. Num caso bem simples, fica assim:

```python
from collections import deque

# roda os efeitos colaterais sem guardar nada
deque(map(print, range(3)), maxlen=0)
```

### Com `for`

```python {linenos=true}
for line in readlines(reader_stream):
    dump_json(
        process_operations_batch(parse_json_line(line)),
        writer_stream,
    )
```

### Com `deque`

```python {linenos=true}
from collections import deque
from functools import partial

deque(
    map(
        partial(dump_json, output=writer_stream),
        map(process_operations_batch, map(parse_json_line, readlines(reader_stream))),
    ),
    maxlen=0,
)
```

Leia de dentro para fora: `parse_json_line` em cada linha, `process_operations_batch` no resultado e `dump_json` no fim. O `deque(..., maxlen=0)` é o ralo no topo: aceita tudo e não guarda nada.

E um detalhe importante: `map` é preguiçoso. Sozinho não faz nada, nenhum efeito colateral roda. Sempre precisa ter alguém puxando os itens, e aqui quem faz isso é o `deque`.

Quando usar cada um? Contra `list(map(...))`, o `deque` ganha sempre: troca uma lista descartável por memória constante. Contra um `for`, a iteração roda em C, então só compensa quando o overhead do loop pesa mais que o trabalho por item (as funções do `map` seguem rodando em Python). Para um corpo de loop simples, o `for` continua mais legível, e foi a forma que ficou no [`capital_gains/cli.py`](https://github.com/cassiobotaro/capital-gains/blob/main/capital_gains/cli.py), de uma refatoração de teste técnico ([slides aqui](https://github.com/cassiobotaro/capital-gains/blob/main/slides.pdf)).

Então é isso, pessoal!

Até a próxima!

{}'s
