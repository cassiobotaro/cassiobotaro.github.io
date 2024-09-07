+++
title = "Somatório"
date = "2019-03-13"
description = "Função somatório escrita de uma maneira divertida."
tags = ["python", "go"]
categories = ["rivendell"]
slug = "somatorio"
+++

![Formula matemática](/images/somatorio.jpg "Formula matemática")

O somatório é um operador matemático, utilizado para representar a soma de termos, mesmo em uma sequência infinita. Seu simbolo é a letra grega sigma.

Aproveitando que python 3 aceita o caracter `Σ`, decidi escrever uma função que soma os termos em um intervalo finito representado pelos limites inferiores e superiores.

```python
def Σ(lower_bound, upper_bound, function):
    '''Summation is a math operator to easily represent a great sum of terms,
    even infinity.
    It's represented with the greek letter sigma.
    Sum terms from lower_bound until upper_bound, applying some function on
    each term.
    >>> Σ(1,5,lambda x:x)  # 1 + 2 + 3 + 4 + 5 = 15
    15
    '''
    return sum(function(index) for index in range(lower_bound,
                                                   upper_bound + 1))
```

Você pode testar através do comando `python -m doctest`ou mesmo de forma interativa.

Apenas por curiosidade, na linguagem Go, a utilização de sigma como nome da função também é permitido.

```go

package main

import (
	"fmt"
)

// Σ is a math operator to easily represent a great sum of terms, even infinity.
// It's represented with the greek letter sigma.
// Sum terms from lower_bound until upper_bound, applying some function on
// each term.
func Σ(lowerBound, upperBound int, function func(float64) float64) float64 {
	sum := 0.0
	for index := lowerBound; index <= upperBound; index++ {
		sum += function(float64(index))
	}
	return sum
}

func main() {
	f := func(x float64) float64 { return x }
	fmt.Println(Σ(1, 5, f))
}
```

Então é isso pessoal!

Até a próxima!

{}'s
