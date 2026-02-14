+++
title = "Números Romanos com Python"
date = "2026-02-14"
description = "Transforme seu código Python em uma DSL elegante para números romanos usando __getattr__ em módulos."
tags = ["python", "dsl", "metaprogramação"]
categories = ["python"]
slug = "numeros-romanos-com-python"
+++

![Números Romanos](/images/numeros-romanos.png "Duas pessoas com trajes romanas e balões dizendo '5' e 'V'")

## Números Romanos

Imagine escrever código Python desta forma:

```python
import roman

print(roman.X)      # 10
print(roman.IV)     # 4
print(roman.XLII)   # 42
print(roman.MCMXC)  # 1990
```

Simplesmente elegante, não? Sem funções, sem conversões explícitas, apenas... números romanos sendo números romanos. É como se a linguagem naturalmente entendesse esse sistema milenar.

## DSLs Internas e Recepção Dinâmica

Martin Fowler, em seu livro "Domain-Specific Languages", classifica DSLs em duas categorias: **externas** (com sua própria sintaxe e analisador sintático) e **internas** (construídas usando a sintaxe da linguagem hospedeira). O que estamos criando aqui é uma **DSL interna**.

Se você já programou em Ruby, conhece o `method_missing` - um método especial que é chamado quando tentamos invocar um método que não existe. Fowler chama isso de padrão **Recepção Dinâmica** (Dynamic Reception): capturar chamadas indefinidas e interpretá-las dinamicamente. É uma ferramenta poderosa para criar DSLs dinâmicas e expressivas.

No livro clássico "Seven Languages in Seven Weeks" de Bruce Tate, há um exemplo fascinante de DSL para números romanos em Ruby usando exatamente essa técnica. O código responde dinamicamente a qualquer "método" que pareça um número romano válido.

Python tem algo similar: `__getattr__` - e o melhor, funciona não apenas em classes, mas também em **módulos** (a partir do Python 3.7)!

## A Implementação: Extensão Literal

Fowler discute o padrão **Extensão Literal** (Literal Extension) - aproveitar os recursos da linguagem hospedeira para estender seu comportamento de forma natural. É exatamente o que fazemos aqui: usamos a capacidade do Python de interceptar acessos a atributos.

O segredo está em definir `__getattr__` no nível do módulo. Quando tentamos acessar um atributo que não existe (como `roman.XIV`), o Python chama essa função com o nome do atributo. Aqui está toda a magia:

```python
# roman.py
def __getattr__(name):
    name = (
        name.replace("IV", "IIII")
        .replace("IX", "VIIII")
        .replace("XL", "XXXX")
        .replace("XC", "LXXXX")
        .replace("CD", "CCCC")
        .replace("CM", "DCCCC")
    )

    return sum(
        name.count(c) * v for c, v in zip("MDCLXVI", [1000, 500, 100, 50, 10, 5, 1])
    )
```

Apenas 13 linhas! A lógica é engenhosa:

1. **Normalização**: Substitui formas subtrativas (IV, IX, XL, etc.) por formas aditivas (IIII, VIIII, XXXX, etc.)
2. **Soma elegante**: Conta cada símbolo romano e multiplica pelo seu valor, somando tudo

## Por Que Isso É Valioso?

Fowler enfatiza que uma boa DSL deve reduzir o "ruído sintático" e aproximar o código da **linguagem do domínio**. Compare:

```python
# Abordagem tradicional (mais ruído):
roman_to_int("MMXXVI")

# DSL interna (linguagem do domínio):
roman.MMXXVI
```

Percebe a diferença? O segundo elimina a cerimônia da chamada de função e das aspas. É mais natural, mais próximo de como pensamos. Fowler chama isso de **legibilidade**: tornar o código compreensível para especialistas do domínio, não apenas programadores.

## Mais Exemplos

```python
import roman

# Anos históricos
print(f"Renascimento: {roman.MCDL}")           # 1450
print(f"Revolução Francesa: {roman.MDCCLXXXIX}") # 1789

# Capítulos de livros
capitulo = roman.VIII  # 8

# Século
seculo = roman.XXI  # 21
```

## Compensações e Boas Práticas

Fowler sempre alerta sobre as **compensações** das DSLs. A Recepção Dinâmica é poderosa, mas tem custos:

- **Depuração**: Erros de digitação não são capturados em tempo de desenvolvimento
- **Ferramentas de desenvolvimento**: IDEs não conseguem fazer autocompletar ou análise estática
- **Desempenho**: Há sobrecarga na interceptação dinâmica

Fowler sugere usar DSLs internas quando os benefícios de expressividade superam esses custos. Para números romanos em código educacional ou scripts pontuais? Vale a pena. Para APIs críticas de produção? Talvez uma função explícita seja melhor.

O segredo é **reduzir a distância semântica** entre intenção e implementação, sem sacrificar manutenibilidade.

## Conclusão

Como Fowler bem coloca: "A linguagem do domínio deve guiar o design da DSL, não o contrário". `__getattr__` em módulos é uma ferramenta poderosa para criar **DSLs internas** elegantes usando padrões como **Recepção Dinâmica** e **Extensão Literal**.

Inspirado por Ruby, Bruce Tate e os princípios de Martin Fowler, vemos que Python oferece as ferramentas necessárias para criar DSLs expressivas que reduzem o ruído sintático e aproximam o código da linguagem do problema.

Da próxima vez que você pensar em criar uma API, pergunte-se: "Como posso tornar isso mais natural? Como posso remover o ruído?" Mas também: "Quais são as compensações? Vale a pena neste contexto?"

Às vezes, a resposta está em um pouco de metaprogramação bem aplicada. ✨

Então é isso pessoal!

Até a próxima!

{}'s
