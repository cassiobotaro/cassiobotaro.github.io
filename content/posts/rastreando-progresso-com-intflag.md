+++
title = "Rastreando progresso com IntFlag"
date = "2026-01-06"
description = "Utilize enumerados e máscaras de bits para rastrear passos de integração de forma elegante."
slug = "rastreando-progresso-com-intflag"
tags = ["python", "dicas", "enum", "intflag"]
categories = ["python"]
+++

![Tracking](/images/tracking.png)

## O Problema

Imagine que você está integrando um produto novo no seu sistema. Este produto deve possuir detalhes e especificações completos antes de ser publicado. Porém, essas informações são adicionadas em passos separados e não necessariamente ordenados. Como verificar que todos os passos foram completados?

Uma solução ingênua seria usar variáveis booleanas para cada passo:

```python
class ProductTrack(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    has_specification = models.BooleanField(default=False)
    has_detail = models.BooleanField(default=False)
    
    def is_complete(self):
        return self.has_specification and self.has_detail
```

Mas e se você precisar adicionar mais passos? Ou remover algum? Cada alteração exige mudanças no modelo, migrações de banco de dados e ajustes na lógica.

## A Solução: IntFlag

Python oferece a classe `IntFlag` do módulo `enum` que permite usar máscaras de bits de forma elegante e legível. A ideia é representar cada passo como um bit diferente em um número inteiro.

```python
from enum import IntFlag, auto

class ProductInfo(IntFlag):
    NONE = 0
    HAS_SPECIFICATION = auto()
    HAS_DETAIL = auto()
    ALL_INFO = HAS_SPECIFICATION | HAS_DETAIL


class ProductTrack(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='track',
        verbose_name='Produto',
    )
    flag = models.IntegerField(default=ProductInfo.NONE.value)

    def __str__(self):
        return f'Rastreamento de {self.product.name}'

    def flag_as(self, flag):
        self.flag |= flag

    def has_flag(self, flag):
        return bool(self.flag & flag)

    def is_complete(self):
        return self.flag == ProductInfo.ALL_INFO
```

## Como Funciona?

### Máscaras de Bits

Cada valor do enum representa uma potência de 2 em binário:

```python
# auto() gera automaticamente os valores
HAS_SPECIFICATION = 1  # binário: 0001
HAS_DETAIL = 2         # binário: 0010
```

Quando combinamos valores usando o operador `|` (OR bit a bit), estamos "ligando" múltiplos bits:

```python
ALL_INFO = HAS_SPECIFICATION | HAS_DETAIL  # binário: 0011 (decimal: 3)
```

### Operações com IntFlag

O método `flag_as` usa o operador `|=` (OR-igual) para adicionar um flag sem remover os existentes:

```python
track.flag_as(ProductInfo.HAS_SPECIFICATION)
# Se flag era 0 (0000), agora é 1 (0001)

track.flag_as(ProductInfo.HAS_DETAIL)
# Se flag era 1 (0001), agora é 3 (0011)
```

Para verificar se um flag específico está ativo, você pode usar o método `has_flag`:

```python
if track.has_flag(ProductInfo.HAS_SPECIFICATION):
    print("Possui especificação!")
```

## Vantagens

1. **Flexibilidade**: Adicionar novos passos é trivial - basta incluir uma nova linha no enum:

```python
class ProductInfo(IntFlag):
    NONE = 0
    HAS_SPECIFICATION = auto()
    HAS_DETAIL = auto()
    HAS_IMAGE = auto()  # Novo passo!
    ALL_INFO = HAS_SPECIFICATION | HAS_DETAIL | HAS_IMAGE
```

2. **Eficiência**: Apenas um campo inteiro no banco de dados ao invés de múltiplos booleanos.

3. **Legibilidade**: O código é expressivo e auto-documentado.

4. **Compatibilidade**: Funciona com qualquer framework (Django, Flask, etc) ou sem framework algum.

## Considerações Finais

Embora o exemplo utilize Django, a solução é genérica e pode ser aplicada em qualquer contexto Python onde você precise rastrear estados ou progresso. IntFlag é uma ferramenta poderosa que combina a eficiência de máscaras de bits com a legibilidade de enumerados.

Então é isso pessoal!

Até a próxima!

{}'s
