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

## DSLs Internas e a Mágica do `__getattr__`

DSL (Domain-Specific Language) é basicamente uma linguagem criada para um propósito específico. Existem as **externas** (com sua própria sintaxe) e as **internas** (que aproveitam a sintaxe da linguagem que você já usa). O que vamos criar aqui é uma **DSL interna**.

Se você já programou em Ruby, deve conhecer o `method_missing` - aquele método especial que é chamado quando tentamos usar algo que não existe. É tipo um "curinga" que captura chamadas indefinidas e faz algo com elas.

No livro "Seven Languages in Seven Weeks" de Bruce Tate, tem um exemplo bem legal de DSL para números romanos em Ruby usando essa técnica. O código responde dinamicamente quando você tenta acessar qualquer nome que pareça um número romano.

Python tem algo parecido: `__getattr__` - e o melhor, desde o Python 3.7, funciona não só em classes, mas também em **módulos**!

## A Implementação

A ideia é simples: vamos aproveitar a capacidade do Python de interceptar acessos a atributos que não existem.

O truque está em definir `__getattr__` no nível do módulo. Quando você tenta acessar algo que não existe (tipo `roman.XIV`), o Python automaticamente chama essa função passando o nome do atributo. É aqui que a mágica acontece:

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

## Por Que Isso É Legal?

Uma boa DSL deixa o código mais limpo e próximo do que você realmente quer dizer. Olha a diferença:

```python
# Jeito tradicional:
roman_to_int("MMXXVI")

# Com DSL:
roman.MMXXVI
```

Viu? O segundo jeito elimina a função e as aspas. Fica mais natural, mais parecido com o que você pensou. O código fica mais fácil de ler e entender.

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

## Os Prós e Contras

Essa técnica é legal, mas tem seus limites:

- **Depuração**: Se você errar a digitação, não vai pegar o erro no momento do desenvolvimento
- **Ferramentas**: IDEs não vão conseguir fazer autocompletar ou te avisar de problemas
- **Desempenho**: Tem um pequeno custo por causa da interceptação dinâmica

Quando vale usar? Depende do contexto. Para números romanos em código educacional ou scripts? Com certeza! Para APIs críticas de produção? Talvez seja melhor usar uma função normal e explícita.

O importante é encontrar o equilíbrio entre deixar o código expressivo e manter ele fácil de manter.

## Conclusão

O `__getattr__` em módulos é uma ferramenta poderosa para criar DSLs internas elegantes em Python. Inspirado por exemplos de Ruby e outras linguagens, vemos que Python oferece recursos bem legais para criar código mais expressivo e natural.

Quando você for criar uma API, pense: "Como posso deixar isso mais natural e limpo?". Mas também pergunte: "Vale a pena nesse caso específico?".

Às vezes, a resposta está em usar um pouco de metaprogramação na medida certa. ✨

Então é isso pessoal!

Até a próxima!

{}'s
