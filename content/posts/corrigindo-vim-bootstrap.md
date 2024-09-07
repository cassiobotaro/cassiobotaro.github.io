+++
title = "Corrigindo o vim bootstrap"
date = "2016-02-11"
description = "Compilado de pequenos problemas que tive e suas soluções."
tags = ["vim", "iniciantes"]
categories = ["vim"]
slug = "corrigindo-o-vim-bootstrap"
+++

![logo-vim](/images/vim.png "Logo Vim")

## Introdução

O intuito deste post é trazer problemas que tive durante a instalação do [vim-bootstrap](https://github.com/avelino/vim-bootstrap) e a solução dos mesmos.

Acredito que minhas dúvidas podem ser de outros também.

Só para referência, sou usuário xubuntu, ou seja, meu ambiente gráfico é o xfce.

Utilizo o vim na versão 7.4, o git na versão 2.5.0. Estas informações são necessárias pois soluções podem divergir por versão.

## FAQ

### `Open github file/line (website), if used git in github` não funciona ?

O que acontece é que é necessária mais uma configuração para que este recurso funcione, isto já foi reportado através da issue [#170](https://github.com/avelino/vim-bootstrap/issues/170).

Primeiro devemos criar/editar o arquivo .gitconfig e adicionar a seguinte configuração.

```
[alias]
	url =! bash -c 'git config --get remote.origin.url | sed -E "s/\\\\.git//g"'

```

Adicionado esta configuração, por conta do meu ambiente gráfico, é necessário trocar comando no .vimrc para:

```
noremap ,o :!echo `git url`/blob/`git rev-parse --abbrev-ref HEAD`/%\#L<C-R>=line('.')<CR> \| xargs xdg-open<CR><CR>
```

Trocamos o `open` por `xdg-open` e agora o comando deve funcionar.

### Copiar e colar na área de transferência do sistema operacional não funciona.

O vim-bootstrap faz o mapeamento da combinação de teclas para copia do texto para a área de transferência do sistema operacional através do `YY`, porém caso só tenha instalado o pacote vim, ele não terá a opção +clipboard e este recurso não funciona.

A solução simples é a instalação do pacote vim-gtk, ainda que não o utilize diretamente.

### Ao copiar e colar códigos python, a palavra import se duplica.

Isto é um problema com o plugin jedi para python, e a solução é adição da seguinte linha à configuração:

```
let g:jedi#smart_auto_mappings = 0
```

### Fiz uma configuração com suporte a linguagem GO, mas não parece ter funcionado.

Para que o plugin go-vim esteja em perfeito funcionamento, o caminho da variável de ambiente GOPATH, deve estar bem configurado e em um diretório com permissões necessárias.
Minha solução que funciona no ubuntu é a adição das seguintes linhas ao bashrc ou zshrc:

```
export GOPATH=$HOME/go
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin
```

Uma outra ação que pode ser necessária é rodar o comando `GoInstallBinaries`.

### Ao tentar comentar blocos de código em templates html com filetype jinja ou django, a notação de comentário está incorreta.

Isto é um problema com o plugin vim-commentary, mas a solução é dita no próprio plugin. O que acontece é que o plugin não reconhece o filetype e não sabe qual sintaxe de comentário destes arquivos.

A correção é através da adição das seguintes linhas no .vimrc:

```

autocmd FileType htmldjango set commentstring={#\ %s\ #}
autocmd FileType jinja set commentstring={#\ %s\ #}

```

### Conclusão

Espero ter ajudado, quem tiver interesse em ver todas as minhas configurações elas estão públicas neste [repositório](https://github.com/cassiobotaro/botaro-toolbelt).

Também não podia deixar de falar no excelente [vimbook](https://github.com/cassiobotaro/vimbook.git), em pt-br, que estou portando para o `gitbook`, para que em breve tenhamos uma versão .epub, .mobi e .pdf.

Então é isso pessoal!

Até a próxima!

{}'s
