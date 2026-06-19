+++
title = "Design docs, parte 3: alternativas, preocupações transversais e mais"
date = "2026-06-15"
publishDate = "2026-06-15"
description = "Como registrar as alternativas que você descartou, o que pode impactar outros times e as seções de fechamento: testabilidade, plano de implantação e perguntas em aberto."
slug = "design-docs-parte-3"
tags = ["design-docs", "arquitetura", "documentação"]
categories = ["engenharia-de-software"]
series = ["design-docs"]
+++

![Design docs (parte 3)](/images/design-docs-3.png "Design docs")

Na [parte 2](/posts/design-docs-parte-2/) descrevemos e justificamos o design da solução. Mas um bom documento também mostra os caminhos que **não** foram seguidos e o que a solução afeta fora do seu time.

> ⚠️ Lembrando: as seções a seguir são exemplos e recomendações, não um molde obrigatório.

## Alternativas consideradas

Aqui você lista os sistemas ou soluções alternativas que foram avaliados, explicando as compensações e as motivações da escolha final.

> **Alternativas consideradas**
>
> **Não fazer nada.** Manter o processo manual com planilhas. Descartado, pois não resolve as rupturas recorrentes nem escala com o crescimento do catálogo.
>
> **Regras heurísticas (reposição por ponto de pedido).** Simples de implementar, mas não captura sazonalidade nem eventos promocionais. MAPE estimado em cerca de 35%, acima do limite aceitável.
>
> **✓ Modelo preditivo batch (escolhido).** Equilibra custo, precisão e prazo de entrega. MAPE esperado ≤ 15%, com reaproveitamento da infraestrutura existente.

💡 **Dicas:**

- Uma alternativa que vale sempre considerar é **não fazer nada**. Documente por que ela foi descartada.
- O foco deve estar nas compensações de cada opção e em como elas levaram à solução escolhida.
- Seja sucinto, mas deixe claro por que a solução escolhida é a melhor dentro das restrições do projeto.

## Preocupações transversais

Descreva o que pode **impactar outras pessoas** além do seu time: segurança, compatibilidade de API, aumento de fluxo em outros sistemas, infraestrutura. Está diretamente ligado à colaboração com os times envolvidos ou impactados pela solução.

> **Preocupações transversais**
>
> **Segurança.** Dados de vendas por loja são sensíveis. Acesso à feature table restrito por IAM ao grupo de ML Engineers. Dashboard com row-level security por regional.
>
> **Infraestrutura.** O job de inferência aumenta o consumo de slots do BigQuery em cerca de 15% durante a execução (04h às 06h). Alinhado com o time de Plataforma.
>
> **Compatibilidade.** A tabela de recomendações segue o schema acordado com o time de Analytics. Mudanças futuras de schema exigem versionamento e comunicação prévia.

💡 **Dicas:**

- Envolva os times o mais cedo possível. Surpresas tardias geram retrabalho e atraso.
- Peça revisões aos times impactados. Eles enxergam problemas que o seu time não vê.

## Outros (fechamento)

Algumas seções curtas costumam fechar bem o documento.

**Testabilidade e observabilidade.** Como a solução será testada e como as métricas vão garantir o sucesso, incluindo como ela será observada em produção.

> Testes: backtesting nos últimos 6 meses e testes de integração via CI do Airflow. Métricas: MAPE ≤ 15% e redução de ruptura ≥ 20% em 90 dias. Observabilidade: alertas no Datadog para falhas no pipeline e latência acima de 2h.

**Plano de implantação.** A segmentação das entregas e os passos para entregar valor de forma incremental e segura.

> 1. Pipeline e feature table em produção (semanas 1 e 2).
> 2. Treinamento e validação do modelo (semanas 3 e 4).
> 3. Piloto com 5 lojas (semanas 5 e 6).
> 4. Rollout completo (semana 7).

**Perguntas em aberto.** Pontos ainda não definidos ou desconhecidos. Sinalizam honestidade e convidam à colaboração.

> - Como tratar produtos com histórico inferior a 30 dias?
> - Qual o SLA aceitável para atraso no pipeline? Aguardando alinhamento com Operações.
> - O modelo deve suportar múltiplos horizontes (7, 14 e 30 dias) nesta versão?

## Até a próxima

Com isso o conteúdo do documento está completo. Na **parte 4** saímos do "o que escrever" e olhamos para o processo: o ciclo de vida do design doc, quando *não* vale a pena escrever um e outros tipos de documento que convivem com ele.

Então é isso, pessoal!

Até a próxima!

{}'s
