+++
title = "POOP: Python infectado por Smalltalk"
date = "2026-05-05"
description = "A história de um interpretador Python sem if, sem for, sem free functions, e o que aprendi escrevendo do zero com IA como copiloto."
slug = "poop-python-infectado-por-smalltalk"
tags = ["python", "smalltalk", "oop", "ia", "experiência"]
categories = ["python", "poo"]
+++

![POOP](/images/poop.png "Logo do projeto POOP")

## Uma provocação à orientação a objetos

Há uma frase de Alan Kay que me persegue há anos:

> OOP é, essencialmente, sobre troca de mensagens.

A primeira vez que ouvi sobre isso, fingi que entendi e segui escrevendo `if` e `for` como sempre. Mas a ideia não saiu da cabeça. O empurrão final veio da palestra [*Nothing is Something*](https://www.youtube.com/watch?v=OMPfEXIlTVE) da Sandi Metz, em que ela mostra como substituir `nil`, condicionais e operadores por objetos que respondem a mensagens, inclusive um `Null Object` que sabe se comportar como qualquer outro. Saí dali com uma vontade enorme de fazer uma provocação concreta ao Python: e se eu tirasse tudo que *parece* procedural, mesmo quando não é? Eu sei que `print(x)` acaba chamando `__str__` e que `len(x)` delega para `__len__`; o modelo de dados do Python é absurdamente coerente nesse aspecto. Mas a *cara* dessas chamadas é de função livre, não de mensagem para um objeto. Sem `if`, sem `for`, sem `print(x)`, sem `len(x)`. Tudo precisa *parecer* uma mensagem enviada a um objeto.

O resultado é o **POOP** (*Python Object Oriented Programming*), um interpretador que executa Python "infectado" pela filosofia Smalltalk. Não é projeto de produção. É uma realização pessoal para abrir a mente sobre design de software e ver o que acontece quando o comportamento do sistema emerge exclusivamente da comunicação entre objetos.

## Como é escrever código no POOP

A pipeline do POOP é simples: `parse → validate → transform → execute`.

- **Validators** rejeitam construções proibidas (`if`, `for`, `print`, `len`, `not`, …).
- **Transformers** reescrevem a AST antes da execução: cada literal vira um tipo POOP (`Int`, `Str`, `Boolean`, `List`, …) e cada `lambda` vira um `Block` de primeira classe.

Algumas substituições típicas:

| Python | POOP |
|---|---|
| `print(x)` | `x.print()` |
| `if cond: ... else: ...` | `cond.if_true_if_false(lambda: ..., lambda: ...)` |
| `for x in col:` | `col.do(lambda x: ...)` |
| `while cond:` | `(lambda: cond).while_true(lambda: ...)` |
| `not x` | `x.not_()` |
| `len(x)` | `x.len()` |
| `x[i]` | `x.at(i)` |

Para sentir o sabor, um detector de ano bissexto sem nenhum `if`, `else` ou `not`:

```python
class Year:
    def __init__(self, value):
        self._value = value

    def is_leap(self):
        return (self._value % 400 == 0).or_(
            lambda: (self._value % 4 == 0).and_(
                lambda: (self._value % 100 == 0).not_()
            )
        )


Year(2000).is_leap().print()  # true  (divisível por 400)
Year(1900).is_leap().print()  # false (divisível por 100 mas não por 400)
Year(2008).is_leap().print()  # true  (divisível por 4 mas não por 100)
```

Repare como `or_` e `and_` recebem **blocos** (`lambda`) em vez de valores. Isso preserva o curto-circuito do Python (o lado direito só é avaliado se necessário), mas a sintaxe muda a forma como você pensa sobre a expressão. Não é mais "se isto e aquilo"; é "este booleano, recebendo a mensagem `or_`, decide se executa o próximo bloco".

## O que aprendi escrevendo com IA como copiloto

Esse foi meu primeiro projeto conduzido **do zero** usando IA como copiloto desde o primeiro commit. Alguns aprendizados já mudaram a forma como trabalho:

**1. A dívida cognitiva é real.**
Mesmo pilotando a IA o tempo todo, percebi que algumas das implementações mais sofisticadas (transformações de AST não triviais, em especial) eu só conhecia no nível macro. Sabia o que estava ali e por quê, mas se você me pedisse para explicar uma linha específica, eu precisaria reler. Isso é uma dívida que cobra juros: na hora de mudar algo, você paga.

**2. Padrão ruim se propaga em velocidade assustadora.**
A IA é um amplificador. Se um padrão ruim entra no código, ela vai replicá-lo em todos os arquivos seguintes, sem pestanejar. A contramedida que funcionou para mim foi tratar cada decisão de design como uma **regra explícita**: assim que percebo um padrão (bom ou ruim), documento, atualizo o `CLAUDE.md` e volto arrumando o que já estava errado. O custo de não fazer isso é exponencial.

**3. O ciclo *pesquisar → planejar → implementar → validar* funcionou muito bem.**
Antes de qualquer linha nova, peço uma pesquisa rápida: qual o trade-off, qual o precedente, o que outras linguagens fazem? Depois um plano. Depois a implementação. E só então a validação: testes, linters (`ruff`), checagem de tipos (`ty`), hooks de pré-commit. Pular a primeira etapa, na minha experiência, é o que mais gera retrabalho.

**4. Toda decisão de projeto vai para um arquivo.**
No POOP, esse arquivo se chama [`INFECTIONS.md`](https://github.com/cassiobotaro/poop/blob/main/INFECTIONS.md). Ele lista cada validator e transformer ativo, com a *razão* da escolha: por que `not x` foi banido, por que `+=` foi mantido, por que `super()` é permitido apesar de parecer um free function. Não é documentação para o usuário. É memória de longo prazo para mim e para a IA.

**5. Decisões em aberto vão para o backlog.**
Tudo que ainda não tenho convicção sobre vai para `proposals.md`. É uma fila de "ideias que parecem boas mas precisam amadurecer". Algumas viram infecções, outras morrem ali, e tudo bem.

**6. Commits atômicos, sempre.**
Pequeno, focado, com mensagem clara. Quando algo dá errado (e dá), um `git bisect` resolve em minutos em vez de horas. Em projeto com IA isso é especialmente valioso, porque facilita reverter uma "boa ideia" da máquina sem destruir o resto.

## O critério estético

Existe uma frase no `INFECTIONS.md` que virou o critério mestre do projeto:

> O critério central de uma infecção não é "isso existe em Smalltalk?" e sim "isso parece um objeto recebendo uma mensagem?".

Operadores como `-x`, `~x` e free functions como `len(x)`, `abs(x)` já são, por baixo dos panos, chamadas de método (`__neg__`, `__invert__`, `__len__`, `__abs__`). Até `not x` chega lá: como Python não tem um `__not__`, o operador cai em `__bool__`. Tudo já é despacho de método. O que falha é a *cara* dessas chamadas, que parece procedural. No POOP, essas mesmas operações viram `x.negated()`, `x.bit_invert()`, `x.len()`, `x.abs()`, `x.not_()`. A ideia é que o código **pareça** uma conversa entre objetos, não uma sequência de operações.

Esse critério estético é o que mais me ensinou sobre design. Boa parte do que chamamos de "OO" em Python é, na verdade, sintaxe procedural com classes por trás. O POOP só fica óbvio quando você tira essa muleta.

## Vale a pena olhar?

Se você gosta de fundamentos, de provocações que abrem a cabeça, ou só quer ver como fica `FizzBuzz` sem um único `if`, o repositório está aqui:

👉 [github.com/cassiobotaro/poop](https://github.com/cassiobotaro/poop)

Tem uma pasta `examples/` com `hello_world`, `fizzbuzz`, `leap_year`, `collatz`, entre outros, cada um com o equivalente em Smalltalk no comentário.

E o `proposals.md` reúne as ideias e mudanças que ainda estão amadurecendo. Se alguma te chamar atenção, abre uma issue ou um PR. Toda contribuição é bem-vinda.

Se curtir, deixa uma estrela. 🌟

Então é isso pessoal!

Até a próxima!

{}'s
