+++
title = "Desenhar o fluxo para decidir"
date = "2026-11-23"
description = "Como uma hora levantando o fluxo de uma aplicação e uma skill de diagramas de sequência em Mermaid ajudaram o time a decidir."
slug = "desenhar-para-decidir"
tags = ["mermaid", "diagramas", "documentação", "ia"]
categories = ["engenharia-de-software"]
+++

Estávamos numa reunião decidindo como implementar a notificação de falhas, se a partir de um registro em arquivo ou no banco, quando um dos engenheiros mais experientes do time disse: "Não entendi, poderiam me explicar melhor o fluxo?".

Ele estava no time havia poucos meses e ainda não tinha todo o contexto da aplicação. Tínhamos um diagrama de contêineres (C4), mas ele é estático. Mostra quem existe e quem fala com quem, e não o caminho que o dado percorre. Eu tenho mais tempo de casa e também não sabia o fluxo inteiro. Então reservei a hora seguinte para descobrir.

> A história é real, mas troquei os sistemas, os nomes e o fluxo deste artigo por um exemplo fictício.

## Levantando o fluxo

Fizemos o levantamento em conjunto com o time. Com calma, listamos os sistemas e descobrimos, passo a passo, o que cada um fazia, conferindo no código. Enquanto o time explicava, eu ia rabiscando. Saíram aquelas anotações que só eu entendo. Depois dessa hora, transformei os rabiscos em um texto corrido e acrescentei o pedido no final. Algo neste formato:

> Sistemas:
> - api (aplicação)
> - fila
> - worker
> - parceiro (externo)
> - volume em disco
> - relatório diário (tarefa agendada)
>
> A api recebe a requisição e envia a tarefa `sincroniza_catalogo` para a fila. O worker consome a fila e busca o catálogo no parceiro. Se o parceiro recusar a credencial, o id do parceiro é gravado em um arquivo no volume. Uma vez por dia, o relatório lê esse arquivo e avisa o time no chat.
>
> A proposta é gravar o id do parceiro em uma tabela no banco, no lugar do volume. Faça o diagrama de sequência das duas versões. Como saída eu espero um arquivo Mermaid e um arquivo PNG.

E rodei esse prompt com a minha [skill de diagramas de sequência](https://github.com/cassiobotaro/skills/blob/main/mermaid-sequence/skills/mermaid-sequence/SKILL.md) em [Mermaid](https://mermaid.js.org). Uma skill é um conjunto de instruções que o agente de IA segue ao executar uma tarefa.

## O resultado

A saída foi um arquivo `.mmd` para cada versão. Este é o da proposta:

```text
sequenceDiagram
    autonumber
    participant A as API
    participant F as Fila
    participant W as Worker
    participant P as Parceiro
    participant B as Banco de dados
    participant R as Relatório diário
    participant G as Chat do time

    A-)F: sincroniza_catalogo.delay(parceiro_id)
    F-)+W: sincroniza_catalogo(parceiro_id)
    W->>+P: Busca o catálogo
    P-->>-W: Credencial recusada
    W->>B: Grava id do parceiro na tabela
    deactivate W

    Note over R: Uma vez por dia
    R->>+B: Consulta a tabela
    B-->>-R: parceiros com falha
    R->>G: Avisa o time
```

Junto veio o PNG de cada versão. Hoje, a falha vai para um arquivo em um volume em disco:

![Hoje: a falha vai para o volume](/diagramas/desenhar-para-decidir/atual.png "Hoje: a falha vai para o volume")

Na proposta, vai para uma tabela no banco:

![Proposta: a falha vai para uma tabela](/diagramas/desenhar-para-decidir/proposta.png "Proposta: a falha vai para uma tabela")

Lado a lado, a diferença fica só nos passos 5 a 7.

Como a fonte é Mermaid, os diagramas são texto. Dá para versioná-los junto com o código e revisar a mudança em um pull request.

## A confusão que o desenho desfez

Durante a conversa, outras pessoas desenvolvedoras do time tiveram uma confusão comum. Com Celery, por exemplo, enfileirar uma tarefa tem cara de chamar uma função:

```python
@app.task
def sincroniza_catalogo(parceiro_id):
    ...

# na api
sincroniza_catalogo.delay(parceiro_id)
```

Lendo o código, parece que `sincroniza_catalogo` roda ali, dentro da API. Não roda. O `.delay()` só publica uma mensagem no broker e volta na hora. Quem executa a função é o worker, em outro processo, quando consome a mensagem da fila.

No diagrama isso é visível: a API entrega a mensagem para a fila (passo 1) e o trabalho começa em outra coluna, a do worker (passo 2). Ver a seta terminar na fila, e não no worker, fez essas pessoas perceberem o que acontecia.

## O que fica

Responder à pergunta "poderiam me explicar melhor o fluxo?" com um desenho ajudou o time a decidir.

Entender o fluxo foi trabalho do time. A IA só transformou o texto dessa conversa em diagramas. Usei a skill porque quem lê um diagrama confia nele, e as regras dela não deixam a IA inventar nada: o que falta no texto vira pergunta. Antes de entregar, a IA ainda valida o diagrama.
