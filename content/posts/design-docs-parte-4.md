+++
title = "Design docs, parte 4: ciclo de vida, quando não escrever e outros documentos"
date = "2026-06-22"
publishDate = "2026-06-22"
description = "Um design doc é documentação viva e tem um ciclo de vida. Veja esse ciclo, as situações em que não vale a pena escrever um e outros documentos que convivem com ele (ADR, RFC, tutorial)."
slug = "design-docs-parte-4"
tags = ["design-docs", "arquitetura", "documentação"]
categories = ["engenharia-de-software"]
series = ["design-docs"]
+++

![Design docs (parte 4)](/images/design-docs-4.png "Design docs")

Nas partes anteriores preenchemos o documento de ponta a ponta. Agora o foco muda: como um design doc vive ao longo do tempo, quando *não* escrever um e que outros documentos andam ao lado dele.

## O ciclo de vida

Um design doc é **documentação viva**. Ele não nasce pronto nem morre quando o código sobe. O caminho típico é:

![Ciclo de vida de um design doc](/images/design-docs-ciclo-de-vida.png "Ciclo de vida do design doc")

1. Escreva um documento, sozinho ou com co-autores.
2. Compartilhe com os colegas que mais entendem do problema e receba críticas e sugestões para melhorá-lo.
3. Compartilhe com um público mais amplo e, de novo, colha críticas e sugestões.
4. Quando estiver confiante, inicie a implementação.
5. Mantenha o documento vivo, adicionando manutenções e aprendizados.

Repare que a revisão aparece mais de uma vez antes de qualquer linha de código. É de propósito: é mais barato corrigir uma decisão no texto do que depois de implementada.

## Quando não escrever

Escrever um design doc tem custo. Em alguns cenários ele rende mais ruído do que valor:

🚫 **A cultura organizacional é patológica.** Não adianta muito escrever documentos que só dizem "é assim que vamos implementar", sem alternativas, compensações ou explicações.

🚫 **A sobrecarga no processo é um problema.** Escrever dá um trabalho extra e, se a organização não enxerga o benefício disso, o processo acaba pesando mais do que ajudando.

🚫 **Não há complexidade suficiente.** Quando a complexidade da tarefa é menor do que o esforço de escrever o documento, ele não se paga.

## Outros documentos

O design doc não é o único formato. Vale conhecer os vizinhos:

- **ADR (Architecture Decision Record).** Captura uma decisão de arquitetura importante junto com seu contexto e suas consequências. Veja [architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) e [adr-tools](https://github.com/npryce/adr-tools).
- **RFC (Request for Comments).** Documentos técnicos criados por indivíduos e organizações para propor e discutir padrões e processos, como faz a IETF. Veja [esta introdução](https://eltonminetto.dev/post/2021-05-15-rfc/) e [o processo da IETF](https://www.ietf.org/process/rfcs/).
- **Tutorial.** Conteúdo de aprendizado guiado, baseado em informações iniciais sobre um assunto e ensinado por quem domina o tema. Um bom exemplo é o [FastAPI do Zero](https://fastapidozero.dunossauro.com/).

Enquanto o design doc foca em *projetar uma solução* antes de implementar, o ADR registra *uma decisão* pontual, a RFC *propõe e discute* um padrão, e o tutorial *ensina*. São complementares.

## Até a próxima

Fechamos o conteúdo e o processo. Na **parte 5**, a última, reúno as ferramentas para escrever e diagramar, as referências para se aprofundar e uma demo de como gerar um design doc com a ajuda de um agente de IA.

Então é isso, pessoal!

Até a próxima!

{}'s
