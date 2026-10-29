+++
title = "Concorrência Go - Daisy-chain"
date = "2026-12-07"
publishDate = "2026-12-07"
description = "Dez mil gorrotinas em fila, cada uma somando 1 e passando adiante. Ninguém usa isso no dia a dia. Serve para medir quanto uma gorrotina custa, e a resposta cabe em uma linha de terminal."
slug = "concorrencia-go-daisy-chain"
tags = ["go", "concorrência", "gorrotinas", "canais", "memória"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/corrente.mp4" titulo="Um valor atravessando uma corrente de gorrotinas, somando 1 em cada elo" >}}

Último da série, e este ninguém usa no dia a dia.

Ele está no fim da palestra [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide), do Rob Pike, e existe para responder uma pergunta só: quanto custa uma gorrotina?

## O que é uma daisy-chain

É uma corrente de gorrotinas. Cada uma recebe um valor da vizinha da direita, soma 1 e passa para a vizinha da esquerda.

Ela também aparece como corrente de gorrotinas ou telefone sem fio.

```go
// recebe da direita, soma 1 e passa para a esquerda
func elo(esquerda chan<- int, direita <-chan int) {
	esquerda <- 1 + <-direita
}

func main() {
	const n = 10000

	pontaEsquerda := make(chan int)
	esquerda := pontaEsquerda
	var direita chan int
	for range n {
		direita = make(chan int)
		go elo(esquerda, direita)
		esquerda = direita
	}

	// solta o 1 na ponta direita...
	go func() { direita <- 1 }()
	// ...e espera ele atravessar as 10 mil gorrotinas
	fmt.Println(<-pontaEsquerda)
}
```

```bash
$ go run .
10001
```

Repare no `esquerda = direita` no fim do laço. O canal que era a direita de um elo vira a esquerda do próximo, e é isso que emenda os 10 mil. Cada gorrotina nasce e fica parada no `<-direita`, esperando a vizinha.

Quando o 1 entra pela ponta direita, a última gorrotina acorda, soma, envia, e a penúltima acorda. Dez mil vezes. Sai 10001 pela outra ponta.

## Mas quanto custa?

Medi aqui, em um i7-1185G7 com Go 1.27.2, o tempo e a memória que o programa pede ao sistema:

```bash
$ go run . 10000
10000 elos: total 40ms, memória 31 MB, 3.1 KB por gorrotina
$ go run . 100000
100000 elos: total 443ms, memória 290 MB, 2.8 KB por gorrotina
$ go run . 1000000
1000000 elos: total 4.327s, memória 2867 MB, 2.8 KB por gorrotina
```

Um milhão de gorrotinas em 4 segundos, e menos de 3 KB para cada uma, já contando o canal que ela carrega.

Para comparar, uma _thread_ do sistema operacional reserva de pilha o que o `ulimit -s` diz, e nesta máquina são 8 MB. Dez mil _threads_ seriam 80 GB de endereço reservado só para somar 1. Uma gorrotina começa com cerca de 2 KB de pilha, e ela só cresce quando a função precisa.

Logo, dividir o trabalho em pedaços bem pequenos, com uma gorrotina para cada, não é um luxo. Foi assim no [fan-out](/posts/concorrencia-go-fan-out/), no [semáforo](/posts/concorrencia-go-semaforo/) com uma gorrotina por tarefa, no [primeiro a responder](/posts/concorrencia-go-primeiro-a-responder/) com uma por réplica. O custo que importa não é criar a gorrotina, é deixar uma presa para sempre, que foi a pulga atrás da orelha desde o [olá mundo](/posts/concorrencia-go-ola-mundo/).

## De onde veio o exemplo

O código está na pasta [`corrente`](https://github.com/cassiobotaro/concorrencia-go/tree/main/corrente) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), e o teste confere o 10001.

E a série acaba aqui. Foram 21 padrões, do olá mundo a esta corrente, todos no mesmo repositório. Se algum exemplo não rodou, se alguma explicação ficou confusa ou se você conhece um padrão que ficou de fora, abra uma _issue_ lá que farei o aprimoramento.

Lembrando que a corrente é brinquedo. O que vale a pena guardar dela é o número: menos de 3 KB por gorrotina, e um milhão delas em 4 segundos.

Então é isso, pessoal!

Até a próxima!

{}'s
