+++
title = "Removendo Labels"
date = "2015-09-28"
description = "Como remover a tag label do formulário o web2py."
tags = ["web2py", "dicas", "forms"]
categories = ["web2py"]
slug = "removendo-labels"
+++

![rotulo](/images/rotulos.png "Rótulos")

## O problema

Recentemente em um projeto pessoal me deparei com o seguinte problema. Ao adicionar um formulário utilizando o helper `SQLFORM`, mais especificamente com o método `SQLFORM.factory`.

Eu não gostaria de exibir a label no formulário e também não gostaria de ter de escrever um form custom só por causa deste problema.

## Discussão sobre o problema

Minha primeira tentativa foi aplicar um formstyle ao formulário. Realizei tentativas frustadas com 'table3cols', 'table2cols' e até mesmos os que utilizam bootstrap(que é utilizado no projeto).

Como uma alternativa decidi procurar algum parâmetro para resolver o meu problema. Foi ai que encontrei o `labels` que por padrão é None. Aprofundando no código fonte, mas já ciente que passar None ao paramêtro não resolveria meu problema, tentei escrever um código para solucionar meu problema, e assim contribuir com outras pessoas também.

Web2py tem a premissa de compatibilidade reversa, ou seja seu programa feito em versões anteriores devem funcinar em versões mais novas, logo não poderia mudar a api do método, nem modificar o comportamento do mesmo.
O que complicou bastante a tentativa de suprimir as labels.

## A solução

Quando tudo parecia perdido, eis que entre buscas no Stack Overflow e Google Groups me deparei com uma elegante solução que caiu feito uma luva em meu problema.

```python
form.elements('label', replace=None)
```

Fica aqui a dica para quem tiver o mesmo problema.

Então é isso pessoal!

Até a próxima!

{}'s
