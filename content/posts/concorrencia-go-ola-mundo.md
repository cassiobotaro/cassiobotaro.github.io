+++
title = "Concorrência Go - Olá mundo"
date = "2026-09-24"
publishDate = "2026-09-24"
description = "O primeiro programa com gorrotinas costuma não imprimir nada. Veja por que isso acontece e como um canal resolve, abrindo a série sobre padrões de concorrência em Go."
slug = "concorrencia-go-ola-mundo"
tags = ["go", "concorrência", "gorrotinas", "canais"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/ola_mundo.mp4" titulo="Uma gorrotina enviando uma mensagem por um canal" >}}

Há alguns anos eu assisti a uma [apresentação](https://github.com/andrebq/andrebq.github.io) do [@andrebq](https://github.com/andrebq) sobre concorrência em Go e minha mente explodiu.

Muito tempo depois resolvi transcrever os exemplos daquela palestra para um repositório, e fui somando outros que encontrei em livros, em artigos e na palestra [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide), do Rob Pike. Virou o [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go).

Agora estou trazendo esse material para cá, um padrão por vez.

## Compartilhe memória comunicando

Go é fundamentada no CSP (_Communicating Sequential Processes_), modelo proposto por Tony Hoare. Nele, em vez de várias linhas de execução mexendo na mesma variável, cada uma faz o seu trabalho e troca mensagens.

Em Go essas mensagens passam por canais, e é daí que vem o provérbio "_Don't communicate by sharing memory, share memory by communicating_".

Todo padrão da série é uma combinação dessa ideia.

## De onde vamos partir

A série parte do ponto que você já sabe como Go funciona: o que é uma gorrotina, o que é um canal, como o `select` escolhe um caso, para que serve um `WaitGroup`.

Se algum desses ainda estiver nebuloso, passe antes pelo [Tour of Go](https://go.dev/tour/concurrency/1). Aqui vamos direto aos padrões.

Mas série que se preza começa por um olá mundo.

## A primeira tentativa

Para executar uma função de forma concorrente basta escrever `go` na frente da chamada. Parece fácil demais, então vamos testar:

```go
package main

import "fmt"

func main() {
	// o go dispara a função em uma gorrotina
	go fmt.Println("Olá, mundo!")
}
```

```bash
$ go run .
$
```

Opa! Cadê a mensagem?

Rodei vinte vezes aqui e ela não apareceu em nenhuma.

O `go` dispara a gorrotina e segue em frente, sem esperar por ela. Só que a próxima coisa que a `main` faz é terminar, e **quando a `main` termina, o programa acaba**, levando junto qualquer gorrotina que ainda esteja por aí.

A nossa nem teve tempo de escrever na tela.

Dá vontade de colocar um `time.Sleep` no fim da `main`. Funciona, mas é chute. Quanto tempo esperar? E se amanhã a função demorar mais?

## Entra o canal

O que a `main` precisa é de um jeito de esperar pela mensagem, e não por um tempo qualquer.

```go
package main

import "fmt"

func main() {
	// um canal de strings, sem buffer
	canal := make(chan string)

	go func() {
		// envia e fica bloqueada até alguém receber
		canal <- "Olá, mundo!"
	}()

	// a main fica bloqueada aqui até a mensagem chegar
	fmt.Println(<-canal)
}
```

```bash
$ go run .
Olá, mundo!
```

Agora sim! 🎉

O canal é a ponte entre a `main` e a gorrotina. Como ele não tem _buffer_, envio e recebimento acontecem juntos: quem chegar primeiro espera pelo outro.

Por isso a `main` não tem como terminar antes da hora.

Repare também que as duas não dividem variável nenhuma. A _string_ sai de um lado e chega do outro, e o canal cuida da sincronização.

Hummm 🤔 e se ninguém lesse o canal?

A gorrotina ficaria bloqueada no envio para sempre, ou melhor, até a `main` terminar. Em um programa deste tamanho ninguém percebe, mas em um servidor que fica meses no ar isso tem nome: vazamento de gorrotinas. Guarde essa pulga atrás da orelha, ela volta mais para frente na série.

## De onde veio o exemplo

O código está na pasta [`ola_mundo`](https://github.com/cassiobotaro/concorrencia-go/tree/main/ola_mundo) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). Lá tem também um `exemplo_test.go` que confere a saída.

No próximo vem o primeiro padrão de verdade, o gerador, que é uma função que devolve um canal e produz valores por conta própria.

E depois dele tem muito mais: _pipeline_, _fan-out_ e _fan-in_, semáforo, janela deslizante, uma gorrotina que decide que outra morreu quando ela para de mandar sinal de vida e até uma corrente de 10 mil gorrotinas, só para ver quanto uma gorrotina custa.

Então é isso, pessoal!

Até a próxima!

{}'s
