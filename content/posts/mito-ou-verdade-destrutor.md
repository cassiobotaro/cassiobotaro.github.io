+++
title = "Mito ou Verdade = Destrutor"
date = "2015-07-25"
description = "Utilizei o `del` para apagar um objeto removendo-o da memória. Verdade ou mito?"
tags = ["python", "mito", "verdade"]
categories = ["python"]
slug = "mito-ou-verdade-destrutor"
+++

![mythbusters](/images/MythBusters-Logo.jpg)

## O problema

Linguagens de programação mais antigas traziam a capacidade de manipulação da memória. A competência de reservar um espaço de memória pra determinada operação e sua posterior liberação era do desenvolvedor.

Python desde o seu início possui um mecanismo simples de alocação e desalocação, é o mecanismo de contador de referencia.

Sempre que um novo objeto é referenciado(alguém passa apontar para aquele objeto), o contador é incrementado e quando deixa de apontar, este contador é decrementado. Chegando a 0 este contador aquele espaço de memória está livre.

Até aqui tudo certo, isto quer então que quando realizo `del <objeto>`, meu objeto é desalocado?

```
lista = []
lista.append(lista)
del lista
```

Aparentemente tudo ok, mas tenho péssimas notícias para lhe dar, o rótulo lista pode até não estar mais referenciando aquele espaço de memória, porém aquele espaço de memória ainda continua ocupado.

## Discussão sobre o problema

Vamos uma demonstração que mostra que aquele objeto ainda estava na memória.

```python
import gc
# Primeiro definiramos que o nível de debug do
# coletor de lixo é DEBUG_LEAK para
# poder ver os objetos coletados pelo coletor
gc.set_debug(gc.DEBUG_LEAK)
# vamos definir uma lista e verificar qual o seu endereço de memória
lista = []
print(hex(id(lista)))
# repetimos o código anterior
# adicionando lista a ela mesmo
lista.append(lista)
# apaga a lista
del lista
gc.collect()
# Repare que um dos elementos coletados foi a
# lista que achamos já ter sido removida
```

Agora que já foi provado, vamos entender melhor como funciona o coletor de lixo do Python.

```python
import gc
# Definiramos que o nível de debug do
# coletor de lixo é DEBUG_LEAK para
# poder ver os objetos coletados pelo coletor
gc.set_debug(gc.DEBUG_LEAK)
# Primeira coisa a saber é que nem todos os objetos provocam o
# comportamento visto acima
variavel = 5
# obs: Tudo em Python é objeto
del variavel
gc.colect()
# não foi coletado pelo coletor como a lista
```

O que acontece é que nem todos os objetos em Python precisam ser monitorados, pois possuem atomicidade em sua construção.
A maneira de verificar se um objeto está sendo monitorado é a seguinte:

```python
import gc
gc.set_debug(gc.DEBUG_LEAK)
variavel = 5
lista = []
print(gc.is_tracked(variavel))
# False
print(gc.is_tracked(lista))
# True
```

Como dito a atomicidade de certos objetos o previnem da geração de ciclos, porém outros podem gerar ciclos e isto faz com que o número de referencias nunca caia a 0.

## Entendendo o `del`

Relembrando, Python tem um sistema de contador de referências, e quando não há mais referências a um objeto seu espaço de memória é desalocado.

Mas porque isso não ocorreu quando eu fiz a lista referenciar a si próprio?

A instrução `del` não pede a desalocação da memória, apenas faz com o contador de referências seja decrementado e associação do rótulo com o espaço de memória desfeita.

## Mais exemplos pois isto não ocorre somente em listas

```python
import gc
gc.set_debug(gc.DEBUG_LEAK)


class Exemplo:

    def __init__(self, ref=None):
        self.alguma_referencia = ref

ref1 = Exemplo()
ref2 = Exemplo(ref1)
ref1.alguma_referencia = ref2
# repare que aqui temos um ciclo, ou seja, objetos se referenciam mutualmente
del ref1, ref2
# os rótulos ref1 e ref2 não se referem mais a nada
# o contador de referências é decrementado
# mas o espaço de memória ainda não foi desalocado
# perceba que cada objeto ainda possui uma referência
gc.collect()
# gc: collectable <Example 0x7f0f59646780>
# gc: collectable <Example 0x7f0f59646b38>
# Podemos ver que agora há a desalocação do objeto
```

## Mas e sobre o destrutor?

O destrutor, ou finalizador é um método chamado quando um objeto está para ser desalocado.
Em python é o método _dunder_ del `__del__`.

```python
import gc


class Exemplo:

    def __init__(self, ref=None):
        self.alguma_referencia = ref
    def __del__(self):
        print("Poderia estar fazendo algo")

ref1 = Exemplo()

del ref1
# deve aparecer em tela "Poderia estar fazendo algo"
# Mas e se ocorrer um cilo?

ref1 = Exemplo()
ref2 = Exemplo()
ref1.alguma_referencia = ref2
ref2.alguma_referencia = ref1

del ref1, ref2
# sim! O finalizador ainda não foi chamado, pois por causa do ciclo
# ainda não finalizado
gc.collect()
# agora sim o finalizador é invocado
```

## Últimas considerações

O coletor de lixo é automático, aqui foi utilizado de forma manual somente para efeito explicativo. E como saber quando ele ocorre?

O Python monitora cada alocação e desalocação que ocorre, e quando a diferença de alocações e desalocações atinge um limite, o coletor de lixo é chamado.

Este limite por padrão é de 700.

```python
import gc
print(gc.get_threshold())
```

Um importante detalhe, este artigo foi escrito em python 3.4. Antes disso o coletor de lixo mantinha os objetos contendo ciclos, classificando-os como _não coletáveis_, estes vazamentos de memória são colocados em `gc.garbage` e necessitam ser tratados manualmente.

## Conclusão

Como vimos há uma certa complexidade envolvida em uma instrução del, e dado isso não podemos garantir que o comando del realmente desaloque o espaço de memória naquele instante.

Logo, Mito foi derrubado!

![busted](/images/busted.jpg)

Então é isso pessoal!

Até a próxima!

{}'s
