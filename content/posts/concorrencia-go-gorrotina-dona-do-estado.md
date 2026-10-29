+++
title = "Concorrência Go - Gorrotina dona do estado"
date = "2026-11-16"
publishDate = "2026-11-16"
description = "Três gorrotinas escrevendo no mesmo mapa e o programa morre. Veja como uma única gorrotina dona do estado atende todo mundo por canais, quando um mutex resolve igual, e a corrida que o detector de corrida não pega."
slug = "concorrencia-go-gorrotina-dona-do-estado"
tags = ["go", "concorrência", "gorrotinas", "canais", "mutex", "select", "race"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/dono_do_estado.mp4" titulo="Uma única gorrotina guardando o mapa e atendendo pedidos por canais" >}}

Três gorrotinas e um mapa de contagem. Cada uma incrementa a sua chave mil vezes:

```go
contagem := make(map[string]int)
var wg sync.WaitGroup
for _, chave := range []string{"gopher", "gopher", "marmota"} {
	wg.Go(func() {
		for range 1000 {
			contagem[chave]++
		}
	})
}
wg.Wait()
fmt.Println("gopher =", contagem["gopher"], "marmota =", contagem["marmota"])
```

Rodei 10 vezes aqui. Em 8 delas:

```bash
fatal error: concurrent map writes
```

Das outras duas, uma deu `gopher = 1218` e só uma acertou os 2000.

O `contagem[chave]++` é ler, somar e escrever, e duas gorrotinas no meio disso se atropelam. O Go percebe e derruba o programa, e quando não percebe, perde incremento em silêncio.

## O que é a gorrotina dona do estado

Lá no [olá mundo](/posts/concorrencia-go-ola-mundo/) apareceu o provérbio "_Don't communicate by sharing memory, share memory by communicating_". Este padrão é ele ao pé da letra.

Em vez de várias gorrotinas mexendo no mapa, uma única gorrotina é dona dele. As outras pedem incrementos e leituras por canais, e ela atende um pedido por vez.

Ele também aparece como monitor ou confinamento. Ator é aproximado, porque no modelo de atores a mensagem vai pelo nome, e aqui vai por canal.

```go
type consulta struct {
	chave    string
	resposta chan<- int
}

// só esta gorrotina toca o mapa
func contador(incrementar <-chan string, consultar <-chan consulta) {
	contagem := make(map[string]int)
	for {
		select {
		case chave, ok := <-incrementar:
			if !ok {
				return
			}
			contagem[chave]++
		case c := <-consultar:
			c.resposta <- contagem[c.chave]
		}
	}
}
```

Repare que o `contagem` é uma variável local da gorrotina. Ninguém de fora tem como chegar nele, então não há corrida porque não há dois donos.

As três gorrotinas da abertura agora mandam a chave pelo canal em vez de mexer no mapa, e a leitura é a [requisição e resposta](/posts/concorrencia-go-requisicao-e-resposta/) do post passado, com a vaga de _buffer_ e tudo:

```go
for _, chave := range []string{"gopher", "gopher", "marmota"} {
	wg.Go(func() {
		for range 1000 {
			incrementar <- chave
		}
	})
}
wg.Wait()

for _, chave := range []string{"gopher", "marmota"} {
	resposta := make(chan int, 1)
	consultar <- consulta{chave: chave, resposta: resposta}
	fmt.Printf("dona do estado: %s = %d\n", chave, <-resposta)
}
close(incrementar)
```

```bash
$ go run .
dona do estado: gopher = 2000
dona do estado: marmota = 1000
```

Preste atenção no `select`. Ele é a fila de atendimento, e como só ele toca o mapa, não precisa de `mutex`, nem de variável de condição, nem de _callback_. É como o Sameer Ajmani resume a técnica na palestra [Advanced Go Concurrency Patterns](https://go.dev/talks/2013/advconc.slide).

## Mas e o mutex?

O Rob Pike tem outro provérbio para isto: "_Channels orchestrate; mutexes serialize_".

Se tudo o que eu preciso é que um incremento não atropele o outro, um `sync.Mutex` faz o serviço:

```go
type contadorMutex struct {
	mu       sync.Mutex
	contagem map[string]int
}

func (c *contadorMutex) incrementar(chave string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.contagem[chave]++
}
```

Mesmo resultado, 2000 e 1000, e sem gorrotina extra nem canal de resposta.

Então quando a gorrotina dona compensa? Quando existe regra sobre como o estado muda, quando ela precisa reagir a vários canais ao mesmo tempo, como a [janela deslizante](/posts/concorrencia-go-janela-deslizante/) fazia com entrada e saída no mesmo `select`, ou quando o estado tem um ciclo de vida próprio. Se nada disso se aplica, acho que o `mutex` é a resposta certa.

## A corrida que o `-race` não pega

O detector de corrida pega o mapa da abertura. Rodei com `go run -race` e ele aponta a linha do `contagem[chave]++` com dois `WARNING: DATA RACE`.

Porém existe uma corrida que ele não vê. Imagine um saque feito com a versão de `mutex`: chama `consultar`, vê saldo 50, e chama uma baixa de 40. Duas gorrotinas fazem isso ao mesmo tempo, as duas veem 50, as duas sacam, e o saldo termina em 30 negativos.

Cada chamada travou e destravou o `mutex` direitinho. Não tem corrida de dados, tem condição de corrida, e a operação composta é que ficou desprotegida.

Na gorrotina dona do estado isto sai de graça. "Saque se houver saldo" vira uma mensagem só, e o `select` atende uma por vez.

## De onde veio o exemplo

O código está na pasta [`dono_do_estado`](https://github.com/cassiobotaro/concorrencia-go/tree/main/dono_do_estado) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), com a versão de `mutex` ao lado. O teste roda com `-race` ligado.

No próximo vem a barreira, em que várias gorrotinas param em um ponto e nenhuma segue até a última chegar.

Lembrando que se as leituras dominam, o `sync.RWMutex` deixa vários `consultar` rodarem juntos com `RLock`, e só o `incrementar` trava todo mundo.

Então é isso, pessoal!

Até a próxima!

{}'s
