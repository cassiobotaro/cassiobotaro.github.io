+++
title = "Introdução ao web2py"
date = "2015-05-04"
description = "Uma breve introdução prática ao framework web2py e uma lista de recursos interessantes."
tags = ["web2py", "iniciantes"]
categories = ["web2py"]
slug = "introducao-ao-web2py"
+++

![Web2py Logo](/images/web2py_logo.png)

## Sobre o web2py

_Framework full stack_ (ou seja assim como Python vem com baterias incluídas), para desenvolvimento rápido, seguro, portável e orientado a banco de dados(o que não o limita).

O download pode ser feito através da página [http://www.web2py.com/](http://www.web2py.com/download) e quando este artigo foi escrito estava em sua versão 2.10.X.

Embora possua versões para _Windows_ e _MAC_ eu recomendo sempre baixar a versão de código fonte.

## Hello Web2py (Talk is cheap. Show me the code)

Iniciaremos criando uma aplicação mínima no **web2py** (sem utilizar sua interface ou um _scaffold_).

Navegue até o diretório `applications` do **web2py**, crie um diretório com o nome da sua aplicação (Eu chamarei o exemplo de _hello_).

Dentro deste diretório inclua um diretório chamado `controllers`.

Em seguida crie um arquivo chamado `default.py` no diretório `controllers` e digite o seguinte código.

```python
def index():
    return 'Hello World'
```

Vá no diretório raiz do **web2py**, rode o arquivo `web2py.py` e pronto!
Para acessar sua aplicação utilize a seguinte URL: `http://127.0.0.1:8000/hello`.

Duas observações devem ser feitas neste ponto, caso navegue no diretório da sua aplicação vai notar que outros diretórios foram criados (não se reocupe com eles por enquanto). Outra coisa é o nome do arquivo _python_ (_default_) e a função (_index_). Isto é um padrão e pode ser modificado utilizando um arquivo de rotas.

Todo o processo acima pode ser resumido da seguinte maneira (à partir da raiz do diretório **web2py**):

```bash
mkdir applications/hello # criação da aplicação
mkdir applications/hello/controllers # criação da pasta controllers
echo "def index():" > applications/hello/controllers/default.py
echo "    return 'Hello World'" >> applications/hello/controllers/default.py
```

![Web2py Word Cloud](/images/tag-cloud-web2py.png)

## Hello Author

Vamos tornar nosso primeiro aplicativo web mais interessante, vamos fazê-lo passar a exibir um nome recebido como argumento em nossa URL.

Abra novamente o controlador `default.py` e agora adicione o seguinte código:

```python
def index():
    nome = request.args(0)
    return {'nome': nome}
```

O código agora foi alterado, para inicialmente receber uma variável chamada nome que contém o valor do argumento 0.

Argumento 0, _wtf_?

Uma URL pode ser decomposta assim no **web2py**:

`http://host/application/controller/action/args1/args2...?var1=valor&var2=valor`

- **host** - Domínio ou subdomínio da sua aplicação(Pode ser `www.algo.com` ou localmente `localhost:8000` sendo 8000 porta padrão do servidor **web2py**)
- **application** - nome da sua aplicação
- **controller** - nome do controlador
- **action** - nome da função presente no controlador
- **args** - argumentos (como parâmetros)
- **vars** - são como variáveis e sempre tem um nome e um valor

O retorno que anteriormente era uma _string_, agora é um dicionário, este dicionário são as variáveis que estarão disponíveis na _template_ para o contexto desta ação.

Agora crie um diretório _default_ na pasta `views` e em seguida adicione um arquivo chamado `index.html` dentro deste diretório.

Neste arquivo adicione o seguinte conteúdo:

```html
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <title>Hello</title>
  </head>
  <body>
    <h1>Hello {{=nome}}</h1>
  </body>
</html>
```

Repare que este arquivo é um arquivo HTML comum, porém na _tag_ `H1` eu utilizo da linguagem de _template_ do **web2py** para adicionar um recurso dinamicamente ao HTML.

`{{}}` é a maneira da _template_ do **web2py** reconhecer que aquele código será avaliado antes de retornar uma resposta ao cliente. O igual indica que uma expressão deve ser avaliada e o retorno será adicionado ao HTML, no caso do exemplo uma variável será adicionada.
Como pode ser visto a variável nome que foi definida para o ambiente desta _action_ (`default/index`) está disponível em minha _template_.

Agora acesse `http://localhost:8000/hello/default/index/cassio` ou substitua `cassio` por algo que queira e veja o resultado.

## Considerações finais

Este foi o primeiro _post_ sobre **web2py** do meu blog, quis ser breve. Se ficou perdido em algum detalhe, não se preocupe, deixe um comentário que adorarei lhe ajudar.

E já adiantando, teremos continuação para este _post_, demonstrando diversos recursos do _framework_ e também discutindo sobre suas "mágicas".

Então é isso pessoal!

Até a próxima!

{}'s
