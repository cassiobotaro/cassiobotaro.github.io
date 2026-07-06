+++
title = "Invocando módulos com python -m"
date = "2026-07-06"
publishDate = "2026-07-06"
description = "A flag -m executa um módulo como script, e a biblioteca padrão está cheia de utilitários prontos: http.server, json.tool, calendar e muito mais."
slug = "python-m-modulo"
tags = ["python", "dicas", "cli"]
categories = ["python"]
series = ["dicas-rapidas"]
+++

O Python tem a flag `-m`, que localiza um módulo e roda ele como script. E a biblioteca padrão está cheia de módulos que viram utilitários de linha de comando prontos pra usar, sem instalar nada.

Servir a pasta atual por HTTP:

```bash
python -m http.server
```

Formatar (e validar) um JSON:

```bash
echo '{"nome": "cassio", "linguagem": "python"}' | python -m json.tool
```

Ver o calendário do ano no terminal:

```bash
python -m calendar 2026
```

Você provavelmente já usou a flag sem perceber, em comandos como `python -m venv .venv` ou `python -m pip install`. É o mesmo mecanismo: se o módulo tem um `__main__`, ele roda como programa.

### Quer a lista completa?

Fui atrás de todos os módulos da biblioteca padrão que funcionam assim e cataloguei tudo no repositório [awesome-python-modules-as-script](https://github.com/cassiobotaro/awesome-python-modules-as-script). Tem servidor SMTP de mentira pra testes, compactação com `gzip`, benchmark com `timeit` e muito mais.

Então é isso, pessoal!

Até a próxima!

{}'s
