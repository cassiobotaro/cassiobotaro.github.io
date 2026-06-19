+++
title = "O protocolo de escrita"
date = "2026-05-12"
publishDate = "2026-05-15"
description = "A partir do Python 3.14, io.Writer e io.Reader expressam exatamente o que sua função precisa, sem arrastar toda a interface de um file-like object."
slug = "protocolo-de-escrita"
tags = ["python", "dicas", "typing"]
categories = ["python"]
series = ["dicas-rapidas"]
+++

## O problema

Quando uma função só precisa escrever em um stream, tipar o argumento como [`IO[str]`](https://docs.python.org/3/library/typing.html#typing-io) é exagero, já que você está exigindo `read`, `seek`, `close` e todo o resto da interface, mesmo que nunca vá usá-los.

## A dica

A partir do **Python 3.14**, o módulo `io` expõe os protocolos `Writer[T]` e `Reader[T]`. Eles descrevem só o contrato mínimo (`write()` ou `read()`), então qualquer objeto que implemente apenas esse método já satisfaz o tipo.

### Antes

```python {linenos=true}
from typing import IO

def dump_json(tax_list: list[OperationResult], output: IO[str]) -> None:
    ...
```

### Depois

```python {linenos=true}
from io import Writer

def dump_json(tax_list: list[OperationResult], output: Writer[str]) -> None:
    ...
```

Na linha 3, a assinatura passa a dizer exatamente o que a função faz, fica mais fácil de testar (basta um stub com `write()`) e aceita mais objetos legítimos.

## De onde veio o exemplo

O trecho acima vem do [`capital_gains/cli.py`](https://github.com/cassiobotaro/capital-gains/blob/main/capital_gains/cli.py), parte de uma refatoração de um teste técnico onde explorei técnicas mais avançadas de Python. Se quiser ver o contexto completo do projeto, a [apresentação está aqui](https://github.com/cassiobotaro/capital-gains/blob/main/slides.pdf).

Então é isso, pessoal!

Até a próxima!

{}'s
