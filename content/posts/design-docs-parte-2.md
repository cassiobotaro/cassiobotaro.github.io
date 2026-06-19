+++
title = "Design docs, parte 2: o design"
date = "2026-06-08"
publishDate = "2026-06-08"
description = "A seção mais importante do design doc: como descrever a solução, apoiá-la em diagramas (C4 e sequência) e deixar explícitas as compensações da escolha."
slug = "design-docs-parte-2"
tags = ["design-docs", "arquitetura", "documentação"]
categories = ["engenharia-de-software"]
series = ["design-docs"]
+++

![Design docs (parte 2)](/images/design-docs-2.png "Design docs")

Na [parte 1](/posts/design-docs-parte-1/) montamos o início do design doc do nosso caso fictício, o Recomendador de reposição de estoque: cabeçalhos, visão geral, escopo e contexto, objetivos e fora de escopo. Agora chegamos ao coração do documento.

> ⚠️ Como sempre, as seções aqui são exemplos e recomendações, não um molde obrigatório.

## O design

Aqui vale um esclarecimento: o "design" não é uma única seção, e sim um conjunto delas. Dependendo do projeto, ele se desdobra em várias partes, cada uma com seu próprio título:

- a solução em si (a visão geral e os detalhes da abordagem);
- diagramas de contexto, arquitetura e sequência;
- APIs, dados manipulados e sua sensibilidade;
- telas e payloads (quando necessário);
- pseudocódigo (raramente).

O que une todas essas seções é o propósito: dado o contexto, os objetivos e os não-objetivos, elas mostram **por que uma determinada solução** atende melhor a esses requisitos. Comece com uma visão geral e depois entre em detalhes.

O segredo é dar foco nas **compensações**. É isso que produz um documento com valor a longo prazo.

> **O design: visão geral**
>
> O sistema é composto por três componentes principais: (1) pipeline de ingestão diário, (2) serviço de treinamento e inferência do modelo de demanda e (3) tabela de recomendações consumida pelo dashboard.
>
> O pipeline coleta dados de vendas, estoque e sazonalidade do data warehouse e os transforma em features para o modelo. O modelo é retreinado semanalmente e gera previsões de demanda para os próximos 7 dias por SKU e loja.
>
> Optamos por batch diário em vez de near-real-time dado o padrão de pedidos do negócio (diário). Isso reduz o custo de infraestrutura em cerca de 40% sem impactar o SLA.

## Diagrama C4 (nível de containers)

O diagrama C4 no nível de **containers** mostra os processos executáveis, bancos de dados e como eles se comunicam dentro do sistema. É útil para comunicar a arquitetura de alto nível sem entrar em detalhes de implementação.

![Diagrama C4 no nível de containers do Recomendador de reposição de estoque](/images/design-docs-c4-containers.png "C4 Container: Recomendador de reposição de estoque")

## Diagrama de sequência

Diagramas de sequência mostram a **ordem das interações** entre os componentes ao longo do tempo. São úteis para documentar fluxos de dados, chamadas de API e processos batch com dependências temporais.

![Diagrama de sequência do fluxo diário de recomendações](/images/design-docs-sequencia.svg "Diagrama de sequência: fluxo diário do recomendador")

## As compensações da solução escolhida

Todo design envolve trocas. Documente explicitamente os prós e contras da solução para que o leitor entenda *por que* essa foi a decisão, e não outra. É isso que dá valor ao documento a longo prazo.

> **Compensações: batch diário vs. near-real-time**
>
> - ✓ Custo de infraestrutura cerca de 40% menor com o mesmo SLA de negócio.
> - ✓ Reutiliza o pipeline Airflow existente, reduzindo risco de regressão.
> - ✓ Modelo baseado em árvores (LightGBM), com explicabilidade por importância de features, facilita auditorias de compliance.
> - ✗ Recomendações com até 24h de defasagem em relação às vendas recentes.
> - ✗ Sem feature store, as features são recalculadas a cada execução do pipeline.
> - ✗ Produtos novos (cold start) não são cobertos nesta versão.

💡 **Dicas:**

- Use fatos e dados para sustentar as decisões. Evite justificativas vagas.
- Evite copiar e colar um schema ou API inteiros. Mostre apenas o que é relevante para a decisão.
- Elementos visuais são complementares, não substitutos das explicações em texto.

## Até a próxima

Com a solução descrita e justificada, ainda falta mostrar o que mais foi avaliado e o que pode afetar quem está fora do time. Na **parte 3** veremos alternativas consideradas, preocupações transversais e as seções de fechamento do design.

Então é isso, pessoal!

Até a próxima!

{}'s
