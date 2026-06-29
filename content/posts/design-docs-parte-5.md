+++
title = "Design docs, parte 5: ferramentas, referências e uma demo"
date = "2026-06-29"
publishDate = "2026-06-29"
description = "Para fechar a série: ferramentas para escrever e diagramar design docs, referências para se aprofundar e uma demo de como gerar um com a ajuda de um agente de IA."
slug = "design-docs-parte-5"
tags = ["design-docs", "arquitetura", "documentação"]
categories = ["engenharia-de-software"]
series = ["design-docs"]
+++

![Design docs (parte 5)](/images/design-docs-5.png "Design docs")

Chegamos à última parte da série. Já vimos o que é um design doc, como preencher cada seção e como ele vive ao longo do tempo. Falta a parte mais prática, que mostra com o que escrever, onde se aprofundar e como um agente de IA pode te dar o primeiro rascunho.

## Ferramentas para escrever

- **Confluence.** Wiki corporativo da Atlassian para criar documentos com colaboração em equipe. Integra com Jira e Bitbucket.
- **Google Docs.** Online e gratuito, com edição colaborativa em tempo real e compartilhamento fácil.
- **GitHub.** Hospeda código e também documentos em Markdown, com edição colaborativa via Pull Requests.

## Ferramentas para diagramas

- **[Mermaid](https://mermaid.js.org).** Diagramas de forma textual: sequência, casos de uso, C4 e mais.
- **[Sequence Diagram](https://sequencediagram.org).** Dedicada a diagramas de sequência, de forma textual e rápida.
- **[Structurizr](https://structurizr.com).** Diagramas como código: vários diagramas de arquitetura C4 a partir de um único modelo.

Os diagramas C4 e de sequência que aparecem na [parte 2](/posts/design-docs-parte-2/) foram feitos com ferramentas como essas.

## Referências para se aprofundar

1. [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) (industrialempathy.com)
2. [Uma introdução aos Design Docs](https://medium.com/inside-picpay/uma-introdu%C3%A7%C3%A3o-aos-design-docs-8590f28f4cc1) (Inside PicPay)
3. [How to Write an Effective Design Document](https://rinaarts.com/how-to-write-an-effective-design-document/) (rinaarts.com)
4. [Design Docs (vídeo)](https://www.youtube.com/watch?v=7V3zX1IZLyw) (YouTube)
5. [RFCs and Design Docs](https://blog.pragmaticengineer.com/rfcs-and-design-docs/) (The Pragmatic Engineer)

## Demo: gerando um rascunho com IA

A relação entre design docs e IA vai nos dois sentidos. Como me lembrou meu amigo Ithalo Alves, *"um design doc pode ser muito útil para alimentar contexto de agentes de IA. Serve como especificação inicial e ajuda a guiar a implementação"*. Ou seja, além de servir de entrada para guiar quem (ou o que) vai implementar, o próprio documento pode ser gerado com a ajuda de um agente.

É esse segundo caminho que a demo a seguir percorre. Para isso, criei a skill [`design-doc`](https://github.com/cassiobotaro/skills), que escreve ou revisa o documento junto com você. Ela trabalha por descoberta interativa. Em vez de já cuspir um texto pronto, te faz perguntas sobre o problema, as compensações, as alternativas e os times impactados, e só então escreve. A ideia é simples, o documento que sai dali é seu e as perguntas é que são dela. Por baixo, ela carrega as dicas que percorremos nesta série e o que fui aprendendo revisando esses documentos na prática. Instale a skill com o comando do GitHub CLI:

```bash
gh skill install cassiobotaro/skills design-doc --agent github-copilot
```

A flag `--agent` indica a ferramenta de destino: troque por `claude-code`, `cursor`, `codex`, entre outros. Quem usa o Claude Code também pode instalar pelo marketplace de plugins:

```bash
claude plugin marketplace add cassiobotaro/skills
claude plugin install design-doc@cassiobotaro-skills
```

Depois, basta acionar o agente com um prompt que traga o contexto e as restrições. Por exemplo:

> Elabore um design doc para um novo pipeline de dados.
>
> **Contexto:** hoje não existe pipeline de predição de churn. Precisamos processar eventos de comportamento do usuário (cliques, tempo de tela, compras) e prever a probabilidade de cancelamento em até 5 minutos após cada ação.
>
> **Restrições e requisitos:**
>
> - Objetivo: latência ponta a ponta ≤ 5 min; AUC-ROC do modelo ≥ 0,80 em 90 dias.
> - Volume: cerca de 10 mil eventos por segundo via streaming.
> - Processamento: camadas de limpeza, enriquecimento e feature store. Preferência por modelos interpretáveis (por exemplo, árvores).
> - Armazenamento: arquitetura Medalhão (Bronze, Silver, Gold).
> - Saída: banco NoSQL para a aplicação e Data Warehouse para análise.
> - Fora de escopo: recomendações em tempo real e integração com CRM.
> - Envolva: times de Segurança e Infraestrutura como revisores.

A partir daí, ela te devolve algumas perguntas antes de escrever. Responda o que souber, porque quanto mais contexto você der, melhor fica o rascunho. E o resultado traz exatamente o que percorremos nesta série: cabeçalho com autores, revisores e estado; objetivos mensuráveis e fora de escopo; alternativas consideradas com compensações; perguntas em aberto e plano de implantação.

Mas vale o lembrete que abriu a parte 1: o agente entrega um rascunho, não um documento final.

💡 **Dicas:**

- A IA acelera a escrita, organiza ideias e tira a página em branco da frente, mas não pensa por você.
- O valor de um design doc está nas decisões que você tomou, nas alternativas que descartou e nas compensações que assumiu. Isso vem do seu conhecimento do problema e do time.
- Copiar e colar sem questionar produz um documento com a aparência de um design doc, não um de verdade.
- Na revisão, quando alguém pergunta "por que não fizeram de outro jeito?", a resposta precisa estar no documento porque você de fato raciocinou sobre ela, não porque saiu pronta do prompt.

Como diz Gergely Orosz, *"não terceirize seu pensamento para a IA"*. O rascunho é da máquina, o raciocínio é seu.

## Fim da série

Essa foi a série sobre design docs. Espero que ela te ajude a transformar decisões técnicas em documentos claros, revisáveis e úteis muito tempo depois de o código ter subido.

Então é isso, pessoal!

Até a próxima!

{}'s
