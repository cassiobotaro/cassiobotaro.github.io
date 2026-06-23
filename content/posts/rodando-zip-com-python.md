+++
title = "Rodando um .zip como aplicação Python"
date = "2026-06-24"
publishDate = "2026-06-24"
description = "O Python executa um .zip direto, basta ter um __main__.py lá dentro. Veja o passo a passo e o módulo zipapp."
slug = "rodando-zip-com-python"
tags = ["python", "dicas", "zipapp"]
categories = ["python"]
series = ["dicas-rapidas"]
+++

## O problema

Você tem uma aplicação Python espalhada em vários arquivos e quer entregar tudo num arquivo só. E se desse pra empacotar num `.zip` e rodar com `python app.zip`?

## A dica

Dá, e é mais simples do que parece. O Python sabe executar um `.zip` direto, desde que tenha um `__main__.py` lá dentro. Vamos do zero.

Crie um arquivo `__main__.py`:

```python
print("Olá, mundo!")
```

Agora compacte num zip:

```bash
zip app.zip __main__.py
```

E rode:

```bash
python app.zip
```

Saída: `Olá, mundo!`. O `.zip` virou executável, sem descompactar nada.

### Por que funciona

Quando você aponta o Python pra uma pasta ou um `.zip`, ele procura um `__main__.py` ali dentro e roda esse arquivo como ponto de entrada. É o mesmo `__main__` de quando você roda `python -m pacote`: o nome que o Python procura pra saber por onde começar. Sem esse arquivo, ele reclama que não encontrou um ponto de entrada.

### Com qualquer aplicação

Pra uma aplicação de verdade, com vários módulos, montar o zip na mão é chato. O módulo embutido `zipapp` faz isso pra você. Você tem a pasta `meuapp` com o seu código e só precisa dizer qual função é o ponto de entrada:

```bash
python -m zipapp meuapp -m "cli:main"
```

Isso gera um `meuapp.pyz` (um zip executável) com um `__main__.py` pronto lá dentro, que só faz:

```python
import cli
cli.main()
```

Aí é só `python meuapp.pyz` e sua aplicação inteira roda a partir de um único arquivo.

Dá até pra incluir suas dependências no zip, basta instalá-las dentro da pasta antes de empacotar (`pip install -r requirements.txt --target meuapp`). Só vale pra pacotes em Python puro: extensões em C não rodam de dentro do zip e precisam estar instaladas à parte.

Quer rodar sem o `python` na frente, só com `./meuapp.pyz`? Gere o `.pyz` com `-p "/usr/bin/env python3"` e dê um `chmod +x` nele.

Então é isso, pessoal!

Até a próxima!

{}'s
