+++
title = "Arquitetura hexagonal em um arquivo só"
date = "2026-08-09"
publishDate = "2026-08-09"
description = "O padrão de portas e adaptadores tem só dois lados, o de dentro e o de fora. Ele não diz nada sobre estrutura de pastas."
slug = "arquitetura-hexagonal-e-simples"
tags = ["arquitetura", "python", "patterns", "hexagonal"]
categories = ["engenharia-de-software"]
+++

![Arquitetura hexagonal](/images/hexagonal.png "Portas e adaptadores")

Toda vez que alguém fala em arquitetura hexagonal aparece um diagrama com quinze pastas, `domain`, `application`, `infrastructure`, e a conversa vira sobre onde colocar arquivo. O padrão não é isso.

Passei um tempo estudando o assunto para montar uma [palestra](https://canva.link/233m7mdrtzzc2c5), e os dois exemplos de código que aparecem aqui saíram direto dela.

> 💡 O padrão é do Alistair Cockburn, e as frases dele ao longo do texto estão traduzidas livremente por mim, a partir do artigo original e do livro.

## Nivelando: o padrão adaptador

Metade do nome do padrão é adaptador. Ele é um dos clássicos do [Design Patterns](https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612), a turma do GoF: converter a interface de uma classe na interface que outra espera. É o adaptador de tomada: o aparelho não muda, a parede não muda, a pecinha no meio faz os dois conversarem.

Guarde essa imagem, porque o hexágono é ela repetida em volta da aplicação inteira.

## Só existem dois lados

> Portas e Adaptadores tem apenas duas camadas: o lado de dentro (a aplicação) e o lado de fora (todo o resto).

O padrão traça uma linha só, entre o dentro e o fora. Camada de aplicação, de domínio, de infra: dividir o dentro assim é escolha sua, não exigência do hexágono.

Toda conversa atravessa uma porta, e quem traduz tecnologia para porta é um adaptador. O Cockburn avisa que porta não é classe: é o ponto de interação que a aplicação define para os atores externos. E ela nasce do propósito:

> A mudança de design que fizeram foi projetar as interfaces do sistema por propósito, e não por tecnologia, e deixar as tecnologias substituíveis (em todos os lados) por adaptadores.

Ele recomenda que as funções de uma porta tenham nomes neutros de tecnologia, batizados pelo propósito de negócio da interação: `tax_rate` e não `select_rate_from_postgres`.

O teste é direto:

> se o banco de dados deixar de ser um banco SQL e passar a ser um arquivo texto ou qualquer outro tipo de banco, a conversa através da API não deve mudar.

## O exemplo

```python
class TaxCalculator:
    def __init__(self, tax_rate_repository):
        self.tax_rate_repository = tax_rate_repository

    def tax_on(self, amount):
        return amount * self.tax_rate_repository.tax_rate(amount)


class FixedTaxRateRepository:
    def tax_rate(self, amount):
        return 0.15


tax_rate_repository = FixedTaxRateRepository()
my_calculator = TaxCalculator(tax_rate_repository)
print(my_calculator.tax_on(100))  # Outputs: 15.0
```

`TaxCalculator` não sabe de onde vem a alíquota. Quem decide é quem monta a aplicação. Trocar o `FixedTaxRateRepository` por um que lê do Postgres não encosta no cálculo.

> Este padrão é simples assim: basta colocar uma API em volta de toda a sua aplicação ou sistema e passar um argumento para configurar cada conexão secundária. Nada além disso.

## Não é sobre pastas

Sobre como organizar o lado de dentro, o livro tem uma seção inteira, e ela é basicamente um encolher de ombros:

> Isso é totalmente com você. "Não é problema meu", como se diz. Você pode fazer um design funcional ou orientado a objetos. Pode fazer um monólito modular ou uma grande bola de lama. Pode usar "clean architecture", domain-driven design, ou qualquer coisa que te sirva. O padrão não diz absolutamente nada sobre esse assunto.

O mesmo hexágono, sem classe nenhuma, em um arquivo só:

```python
def tax_on(tax_rate):
    def calculate_tax(amount):
        return amount * tax_rate(amount)

    return calculate_tax


def fixed_tax_rate(amount):
    return 0.15


tax_on(fixed_tax_rate)(100)  # Outputs: 15.0
```

Um closure faz o mesmo trabalho: `tax_rate` é a porta, `fixed_tax_rate` é o adaptador.

> Lembre-se: em Portas e Adaptadores você é livre para organizar o lado de dentro da aplicação como quiser, e as coisas fora da aplicação como quiser.

## E a interface?

Nos dois exemplos acima ninguém declarou interface nenhuma. Isso incomoda quem vem de Java, e o livro trata do assunto:

> A estrutura de pastas não é coberta pelo padrão, nem é a mesma em todas as linguagens. Algumas linguagens (Java) exigem definições de interface. Outras (Python, Ruby) não. E algumas, como Smalltalk, nem têm o conceito de arquivos!

Em Python é assim mesmo: basta o objeto ter o método. Se quiser o contrato explícito para o type checker, use `Protocol`:

```python
from typing import Protocol


class TaxRateRepository(Protocol):
    def tax_rate(self, amount: float) -> float: ...
```

## Quando usar

O padrão cobra indireção e código de montagem, então só se paga onde substituir e isolar importam de verdade.

Vale considerar no subdomínio core, aquele que dá vantagem competitiva ao negócio. Seguindo a dica de Vlad Khononov, no [Learning Domain-Driven Design](https://www.amazon.com/Learning-Domain-Driven-Design-Aligning-Architecture/dp/1098100131), é ali que valem os padrões de modelagem mais sofisticados. Num CRUD de cadastro, provavelmente não.

## Para se aprofundar

O [artigo original do Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture) é a fonte, e o livro [Hexagonal Architecture Explained](https://www.amazon.com/Hexagonal-Architecture-Explained-Alistair-Cockburn/dp/173751978X), dele com Juan Manuel Garrido de Paz, é a leitura definitiva. Recomendo muito. Para ver rodando, montei o [pysmallerwebhexagon](https://github.com/cassiobotaro/pysmallerwebhexagon), versão em Python do exemplo do próprio Cockburn.

Então é isso, pessoal!

Até a próxima!

{}'s
