+++
title = "Concorrência Go - Sistema de ticket"
date = "2026-11-03"
publishDate = "2026-11-03"
description = "Dez chamadas por segundo, e nem uma a mais. Veja como uma bilheteria de tickets regula o ritmo de um trabalhador, por que um Ticker entrega dois tickets de uma vez, e o que esta versão deixa de fora."
slug = "concorrencia-go-sistema-de-ticket"
tags = ["go", "concorrência", "gorrotinas", "canais", "rate-limiting", "timer"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/ticket.mp4" titulo="Uma bilheteria emitindo tickets em um ritmo fixo para um trabalhador" >}}

No [semáforo](/posts/concorrencia-go-semaforo/) o limite era de três tarefas ao mesmo tempo.

Mas tem API que não liga para quantas chamadas estão abertas, e sim para quantas você faz por segundo. Passou de dez, toma um `429` e fica de castigo.

Aqui o limite não é de ocupação, é de ritmo.

## O que é um sistema de ticket

Um sistema de ticket controla quando um trabalho pode começar. Uma gorrotina faz o papel de bilheteria e emite tickets a uma taxa fixa, e o trabalhador só executa depois de pegar um.

Ele também aparece como _rate limiting_ ou _throttling_, mas são nomes aproximados. Já volto nisso.

O trabalhador recebe dois canais, um de trabalhos e um de tickets:

```go
type ticket int

func trabalhador(tickets <-chan ticket, trabalhos <-chan func()) {
	for {
		// lê o trabalho primeiro, para não gastar ticket à toa
		trabalho, ok := <-trabalhos
		if !ok {
			return
		}
		<-tickets // espera autorização antes de executar
		trabalho()
	}
}
```

Repare na ordem. Se o canal de trabalhos fechou, o trabalhador encerra sem pegar um ticket que ninguém vai usar.

E a bilheteria emite um ticket a cada `janela/nTickets`:

```go
func bilheteria(ctx context.Context, tickets chan<- ticket, janela time.Duration, nTickets int) {
	intervalo := janela / time.Duration(nTickets)
	pausa := time.NewTimer(intervalo)
	defer pausa.Stop()

	for i := 0; ; i++ {
		select {
		case tickets <- ticket(i):
		case <-ctx.Done():
			return
		}
		// o intervalo conta a partir da entrega
		pausa.Reset(intervalo)
		select {
		case <-pausa.C:
		case <-ctx.Done():
			return
		}
	}
}
```

A `main` pede dez tickets por segundo e manda 31 trabalhos:

```go
go bilheteria(ctx, tickets, 1*time.Second, 10)
go func() {
	trabalhador(tickets, trabalhos)
	close(pronto)
}()

for i := 0; i <= 30; i++ {
	trabalhos <- func() {
		fmt.Println("processando ticket")
	}
}
close(trabalhos)
<-pronto
```

Rodei aqui e os 31 trabalhos levaram 3,25 segundos. Dez por segundo, como pedido.

## Mas por que não um `Ticker`?

Dá para escrever a bilheteria com um `time.Ticker`, que já dispara sozinho a cada intervalo. Esperar o tique e entregar o ticket. Parece a ferramenta certa, neh?

Escrevi essa versão para comparar.

Deixei o trabalhador dormindo 250 milissegundos antes de pegar o primeiro ticket, e anotei quando cada um chegou:

```bash
$ go run . ticker
ticket 0 em  250ms (intervalo desde o anterior:   0ms)
ticket 1 em  251ms (intervalo desde o anterior:   1ms)
ticket 2 em  300ms (intervalo desde o anterior:  49ms)
ticket 3 em  400ms (intervalo desde o anterior: 100ms)
```

Opa! O ticket 1 saiu 1 milissegundo depois do 0.

O `Ticker` continuou tiquetando enquanto a bilheteria estava parada no envio, e ele guarda um tique no canal. Quando o trabalhador finalmente pegou o ticket 0, a próxima volta do laço encontrou o tique já esperando, e o ticket 1 saiu na hora. Dois de uma vez, e lá se foi o limite.

Com o `Timer`, o `Reset` acontece depois da entrega, ou seja, o intervalo conta a partir do momento em que o trabalhador pegou o ticket:

```bash
$ go run . timer
ticket 0 em  250ms (intervalo desde o anterior:   0ms)
ticket 1 em  351ms (intervalo desde o anterior: 100ms)
ticket 2 em  451ms (intervalo desde o anterior: 100ms)
ticket 3 em  551ms (intervalo desde o anterior: 100ms)
```

Logo, por mais lento que o trabalhador seja, nunca saem dois tickets juntos.

## Mas e a rajada?

É aqui que o nome _rate limiting_ fica aproximado.

Esta bilheteria nunca deixa dois saírem juntos, então ela também não permite rajadas. Se o trabalhador ficou dez segundos sem pedir nada, ele não ganhou cem tickets acumulados. Ganhou um.

Um limitador de verdade, o _token bucket_, começa com um saldo de `n` fichas e repõe uma a cada `janela/n`. Dá para gastar as `n` de uma vez e depois esperar. Se a sua API tolera rajada, o pacote `golang.org/x/time/rate` faz isso e não vale a pena reinventar.

## De onde veio o exemplo

O código está na pasta [`ticket`](https://github.com/cassiobotaro/concorrencia-go/tree/main/ticket) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste de lá roda no `synctest` com cinco tickets a cada 50 milissegundos, e três trabalhos levam exatos 20 milissegundos, porque na bolha do relógio falso o tempo só anda quando todo mundo está esperando.

No próximo vem o processamento em lote, que junta valores que chegam um a um para processar de uma vez.

Lembrando que o `Reset` sem drenar o `pausa.C` só é correto desde o Go 1.23, e com o `go.mod` declarando `go 1.23` ou mais novo. Antes disso um tique velho ficava no canal e o ticket seguinte saía na hora, o mesmo problema do `Ticker`.

Então é isso, pessoal!

Até a próxima!

{}'s
