+++
title = "Design docs, parte 1: o que são e o início do documento"
date = "2026-06-01"
publishDate = "2026-06-01"
description = "O que é um design doc, por que vale a pena escrever e como montar o início do documento: cabeçalhos, visão geral, glossário, escopo e contexto, objetivos e fora de escopo."
slug = "design-docs-parte-1"
tags = ["design-docs", "arquitetura", "documentação"]
categories = ["engenharia-de-software"]
series = ["design-docs"]
+++

![Design docs (parte 1)](/images/design-docs-1.png "Design docs")

Um **design doc** é um documento relativamente informal que a pessoa autora principal (ou as autoras) de um sistema de software cria antes de embarcar no projeto de codificação. Ele documenta a estratégia de implementação de alto nível e as principais decisões de design, com ênfase nas compensações consideradas ao longo do caminho. Em outras palavras, é onde registramos o racional da solução adotada, as alternativas, os objetivos e a arquitetura, de forma clara e compartilhável com o time, antes de gastar tempo escrevendo código.

Por que isso vale a pena? Um bom design doc ajuda a:

- identificar problemas de design cedo, quando mudar ainda é barato;
- alcançar consenso em torno do projeto na organização;
- garantir que preocupações transversais (segurança, infraestrutura, etc.) sejam consideradas;
- escalar o conhecimento das pessoas mais experientes;
- formar uma memória organizacional das decisões de design;
- servir como artefato resumido no portfólio técnico de quem projetou.

Este é o primeiro de uma série sobre design docs. Aqui vamos do conceito até as primeiras seções do documento. Nas próximas partes seguimos preenchendo o restante.

## Antes de tudo: isto não é um molde

> ⚠️ As seções apresentadas nesta série **não são um guia obrigatório a ser seguido**. São apenas exemplos e recomendações. Use, adapte ou descarte conforme o seu contexto e o tamanho do problema.

Dito isso, ter uma estrutura de referência ajuda muito quem está começando. Vamos percorrer essa estrutura usando um caso fictício do começo ao fim.

## O caso que vamos acompanhar

Imagine um **Recomendador de reposição de estoque**: um modelo de previsão de demanda, um pipeline diário e um dashboard para o time de planejamento decidir o que repor em cada loja.

O projeto envolve três áreas: **ciência de dados** (o modelo de previsão), **engenharia de dados** (o pipeline e as tabelas) e **análise de dados** (o dashboard e os KPIs). É um problema com complexidade suficiente e mais de um time envolvido, exatamente o tipo de situação em que um design doc se paga.

## Cabeçalhos

Os cabeçalhos identificam o documento. Costumam conter as pessoas autoras e revisoras, o estado atual (rascunho, em revisão, proposto, aprovado, rejeitado), as datas de criação e atualização e, opcionalmente, rótulos.

**Exemplo de cabeçalho:**

| Campo | Valor |
|---|---|
| Documento | DESIGN-DOC · DD-2026-014 |
| Estado | Em revisão |
| Título | Recomendador de reposição de estoque |
| Autoras | Júlia Tanaka (DS), Rafael Borges (DE) |
| Revisoras | Camila Souza (Plataforma), Pedro Lins (Segurança), Ana Vitória (Analytics) |
| Criado em | 12 mar 2026 |
| Última atualização | 23 abr 2026 |
| Tags | #ml #supply-chain #batch-pipeline |

💡 **Dicas:**

- Mantenha o **estado** atualizado. Um doc "em revisão" há quatro meses confunde quem chega depois.
- Peça revisão a pessoas com mais senioridade das áreas relevantes (segurança, infraestrutura, plataforma) ou dos times impactados.
- Rótulos (tags) ajudam na busca quando alguém procura "como decidimos X" meses depois.

## Visão geral

Um texto breve e de alto nível sobre o que o documento trata. Serve para dizer ao leitor o que esperar na leitura.

> **Visão geral**
>
> Este documento descreve o design do sistema de recomendação de reposição de estoque. O objetivo é substituir o processo manual de pedidos por um modelo preditivo que sugere, diariamente, quais produtos repor em cada loja com base em histórico de vendas e tendências sazonais.
>
> São abordados a arquitetura do pipeline de dados, a estratégia de treinamento do modelo e a forma como os resultados serão entregues ao time de planejamento.

💡 **Dicas:**

- Tipicamente é um parágrafo, no máximo dois.
- Não coloque detalhes aqui. Eles ficam nas seções seguintes.
- Alguém sem contexto deve conseguir entender do que se trata.

## Glossário

Siglas e termos de domínio usados ao longo do documento. Vale posicioná-lo **logo no início**: assim quem chega de outra área tem onde consultar o vocabulário antes de esbarrar com os termos no meio do texto. Idealmente, defina cada termo já na primeira aparição e use o glossário como referência rápida.

> - **MAPE** (Mean Absolute Percentage Error): erro percentual absoluto médio das previsões; quanto menor, mais preciso o modelo.
> - **SLA** (Service Level Agreement): prazo ou nível de serviço acordado, como o horário-limite de entrega das recomendações.
> - **SKU** (Stock Keeping Unit): identificador único de um produto no catálogo.
> - **ERP** (Enterprise Resource Planning): sistema de gestão usado hoje para os pedidos de reposição.
> - **Ruptura de estoque:** ausência de um item disponível para venda quando existe demanda por ele.
> - **Cold start:** previsão para produtos novos, sem histórico de vendas suficiente.
> - **Feature store:** repositório centralizado de features para reúso entre modelos.

💡 **Dicas:**

- Não precisa virar um dicionário. Liste apenas o que pode confundir quem é de fora do time.
- Defina os termos antes do primeiro uso e mantenha o glossário no topo, como referência rápida de consulta.

## Escopo e contexto

Descreve o cenário em que o sistema está inserido, os motivadores da escrita do documento e informações de contexto (tecnologia atual, dívidas técnicas, etc.). Você pode assumir algum conhecimento prévio e vincular informações mais detalhadas em vez de copiá-las.

> **Escopo e contexto**
>
> O time de planejamento realiza hoje a reposição de estoque de forma manual, consultando planilhas exportadas do ERP semanalmente. O processo é suscetível a erros e resulta em rupturas recorrentes nos itens de maior giro.
>
> O pipeline atual de dados de vendas roda em batch diário via Airflow, mas não é consumido por nenhum modelo preditivo. Existe uma dívida técnica relacionada à ausência de feature store centralizada.
>
> O escopo deste documento abrange o modelo de demanda, o pipeline de ingestão e a entrega de recomendações. Integrações com o ERP estão fora do escopo.

💡 **Dicas:**

- Seja sucinto. Dê o contexto mínimo necessário para o leitor entender o problema.
- Não coloque objetivos nem soluções propostas aqui. Isso vai nas próximas seções.
- Encare como um plano de fundo: situa o leitor sem antecipar decisões.

## Objetivos e fora de escopo

**Objetivos** são requisitos de negócio ou técnicos que serão alcançados com a conclusão do trabalho. **Fora de escopo** são pontos que não serão contemplados. Ambos podem ser listas e devem ser objetivos, no sentido de claros e verificáveis.

> **Objetivos**
>
> - ✓ Reduzir ruptura de estoque em 20% nos itens de alto giro até o Q3 de 2026.
> - ✓ Entregar sugestões de reposição diariamente via dashboard até às 7h.
> - ✓ Atingir MAPE ≤ 15% no modelo de previsão de demanda.
>
> **Fora de escopo**
>
> - ✗ Integração direta com o sistema ERP de pedidos.
> - ✗ Previsão de demanda para produtos novos (cold start).
> - ✗ Otimização de preços ou mix de produtos.

💡 **Dicas:**

- Dê preferência a objetivos mensuráveis. Números tornam o sucesso verificável.
- Em fora de escopo, não negue apenas os objetivos. Aponte o que está explicitamente excluído do trabalho.
- Seja específico: aponte o mecanismo, não só o resultado. Em vez de "reduzir ruptura de estoque", escreva "reduzir ruptura de estoque priorizando o reabastecimento dos itens de maior giro".

## Até a próxima

Já temos a identificação do documento, um glossário para nivelar o vocabulário e o pano de fundo: quem escreve, do que se trata, em que cenário e o que se pretende (ou não) alcançar. Na **parte 2** entramos na seção mais importante, o design propriamente dito, com diagramas e as compensações da solução escolhida.

Então é isso, pessoal!

Até a próxima!

{}'s
