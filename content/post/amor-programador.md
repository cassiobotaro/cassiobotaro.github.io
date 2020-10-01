---
title: "Amor Programador"
date: "2019-03-20"
description: "Declaração de amor de uma pessoa programadora."
tags: ["python", "go"]
categories: ["rivendell"]
aliases: ["amor-programador"]
---

![mao-coracao](/images/coracao.jpg "Mãos em formato de coração")

Expressar sentimentos pode ser por muitas vezes muito difícil, e *normalmente* pessoas que programam tem esta dificuldade.

Em uma tarde qualquer, à procura de uma diversão com programação me perguntei "Como desenhar um coração com python?".

Como pessoa programadora experiente, fui ao google e digitei esta pergunta e para minha surpresa o primeiro resultado não me levava ao stack overflow e sim ao [quora](https://www.quora.com/How-can-I-draw-a-heart-using-Python).

Achei várias implementações, mas a que mais me chamou atenção foi uma que isto era feita em **somente uma linha**.

Vamos mergulhar nesta implementação, passo a passo e por fim vamos juntar todas as partes em um resultado final.

## Desenhando uma matriz

A primeira coisa a se fazer é criar uma matriz, uma maneira simples de se fazer isto em python é fazendo uma composição de listas em uma lista.

```python
matriz = [[1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]]
```

Para nossa declaração, faremos uma matriz maior, de 60 linhas e 60 colunas, criada de forma dinâmica.

```python
matriz = []

for y in range(30, -30, -1):  # vai de 30 até -29 decrementado um
    linha = []
    for x in range(-30, 30):  # vai de -30 até 29
        linha.append(" ")
    matriz.append(linha)

print(len(matriz))  # numero de linhas
print(len(matriz[0]))  # numero de colunas
print(matriz)
```

Sei que deve estar se perguntando, mas por quê raios você está percorrendo de 30 até -29, decrementado de um em um, e no laço de repetição internovai de -30 até 30 incrementando 1 ao valor a cada iteração?.

Afinal isto é uma iteração de 60 valores em cada repetição, mas estes números mágicos de x e y são necessários no próximo passo, quando iremos preencher a nossa matriz fazendo um desenho.


## Preenchendo a matriz

Sei que foi um pouco frustrante quando após executar o código anterior só tinhamos um monte de espaçoes vazios.

Vamos começar então a preencher nossa matriz.

A primeira alteração que devemos fazer em nosso código é substituir a linha onde realizamos o `append` na linha.

```diff
-        linha.append(" ")
+        linha.append("❤")
```

Nossa! Quantos corações!

Começou a ficar legal, mas para realmente tomar forma como queremos, vamos restringir quais posições na nossa matriz que iremos preencher.

Para isso utilizaremos a fórmula do amor, e em breve você vai entender por que ela é chamada assim.

![equação matemática](/images/equacao-amor.jpeg "equação matemática do amor")

Modificaremos o preenchimento das linhas da nossa matriz, colocando um "❤" quando nossa equação for satisfeita senão um espaço em branco.

```python
matriz = []

for y in range(30, -30, -1):
    linha = []
    for x in range(-30, 30):
        if ((x * 0.05) ** 2 + (y * 0.1) ** 2 - 1) ** 3 - (x * 0.05) ** 2 * (
            y * 0.1
        ) ** 3 <= 0:
            linha.append("❤")
        else:
            linha.append(" ")
    matriz.append(linha)

print(matriz)
```

## Melhorando a exibição

Tudo bem, ainda não está bonito o que está sendo mostrado em nosso programa. E por incrivel que pareça, vamos modificar somente duas linhas e o resultado será incrível.

Primeira mudança, é a junção de todas as colunas de uma linha, assim nossa antiga matriz passa a ser somente uma lista.

```diff
-    matriz.append(linha)
+    matriz.append("".join(linha))
```

As linhas agora irão parecer como "          ..." ou "  ❤❤❤❤❤...".

A próxima mudança é realizar a junção das linhas separando-ascom uma quebra de linha.

```diff
- print(matriz)
+ print("\n".join(matriz))
```

Optei por não mudar o nome da variável matriz por enquanto somente por uma questão didática.

O novo código ficaria assim:

```python
matriz = []

for y in range(30, -30, -1):
    linha = []
    for x in range(-30, 30):
        if ((x * 0.05) ** 2 + (y * 0.1) ** 2 - 1) ** 3 - (x * 0.05) ** 2 * (
            y * 0.1
        ) ** 3 <= 0:
            linha.append("❤")
        else:
            linha.append(" ")
    matriz.append("".join(linha))

print("\n".join(matriz))
```

## Nomeando seu amor

Hummm 🤔, estava aqui pensando, não seria legal se o programa fosse ainda mais exclusivo e com o nome da pessoa?

Felizmente essa alteração é bem simples, vamos acrescentar o nome da pessoa a uma variável.

```diff
+ nome = "amor"
```
Depois vamos colocar uma lógica de modo que a cada coluna uma letra diferente seja colocada, formando o nome da pessoa.

```diff
-            linha.append("❤")
+            linha.append(nome[(x - y) % len(nome)])
```

🎉Yeah! Agora temos uma versão customizada com o nome da pessoa.

```python
matriz = []
nome = "amor"

for y in range(30, -30, -1):
    linha = []
    for x in range(-30, 30):
        if ((x * 0.05) ** 2 + (y * 0.1) ** 2 - 1) ** 3 - (x * 0.05) ** 2 * (
            y * 0.1
        ) ** 3 <= 0:
            linha.append(nome[(x - y) % len(nome)])
        else:
            linha.append(" ")
    matriz.append("".join(linha))

print("\n".join(matriz))
```

## Tudo em uma linha só

Só por curiosidade, está é a versão original, feito em uma linha, retirada do quora.

```python
print("\n".join(["".join([("Love"[(x-y) % len("Love")] if ((x*0.05)**2+(y*0.1)**2-1)**3-(x*0.05)**2*(y*0.1)**3 <= 0 else " ") for x in range(-30, 30)]) for y in range(30, -30, -1)]))
```

## Gophers também amam

Pensando que a pessoa a receber a declaração possivelmente não tenha python no seu computador, e que pode também utilizar windows, decidi escrever também uma versão em GO.

```go
package main

import (
	"fmt"
	"math"
	"strings"
)

var love string

func main() {
	if love == "" {
		love = "Love"
	}
	lines := []string{}
	for y := 30.0; y > -30; y-- {
		arr := []string{}
		for x := -30.0; x < 30; x++ {
			result := " "
			if math.Pow(math.Pow(x*0.05, 2)+math.Pow(y*0.1, 2)-1, 3)-math.Pow(x*0.05, 2)*math.Pow(y*0.1, 3) <= 0 {
				result = string(love[modPy(int(x-y), len(love))])
			}
			arr = append(arr, result)
		}
		lines = append(lines, strings.Join(arr, ""))
	}
	fmt.Println(strings.Join(lines, "\n"))
	var exit rune
	fmt.Scanf("%c", &exit)
}

func modPy(d, m int) int {
	var res = d % m
	if (res < 0 && m > 0) || (res > 0 && m < 0) {
		return res + m
	}
	return res
}

```

Algumas informações interessantes.

A operação de módulo na linguagem go, possui comportamento diferente do python, pesquisando na internet descobri como contornar através da função `modpy`. Entenda mais neste [link](https://stackoverflow.com/questions/43018206/modulo-of-negative-integers-in-go#answer-43018347).

A variável `love` é inicializada com seu valor zero que é "", e quando o programa é executado, caso esta variável esteja vazia, modificamos seu valor para "love".

Uma maneira de customizar o nome ao compilar o programa é atraves de `-ldflags`.

`go build -ldflags="-X main.love=<name>" love.go`

Se está no linux e deseja compilar o programa para enviar a alguém que utilize windows, utilize a variável `$GOOS`.

`GOOS=windows go build -ldflags="-X main.love=<name>" love.go`

Então é isso pessoal!

Até a próxima!

[] "s
