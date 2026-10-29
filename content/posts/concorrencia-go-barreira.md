+++
title = "Concorrência Go - Barreira"
date = "2026-11-18"
publishDate = "2026-11-18"
description = "Quatro gorrotinas param em um ponto e nenhuma segue até a última chegar. Veja como um WaitGroup em que todo mundo chama Done e Wait faz isso, e os dois jeitos de errar: inverter a ordem e reaproveitar a barreira."
slug = "concorrencia-go-barreira"
tags = ["go", "concorrência", "gorrotinas", "waitgroup", "barrier", "sync"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/barreira.mp4" titulo="Quatro gorrotinas chegando a uma barreira e passando juntas" >}}

No [fan-out](/posts/concorrencia-go-fan-out/) a `main` esperava os trabalhadores com um `wg.Wait()`. Um só esperando, vários sendo esperados.

Mas e quando todas precisam esperar umas às outras? Quatro gorrotinas carregam dados em paralelo, e nenhuma pode começar a calcular antes de todas terminarem de carregar.

## O que é uma barreira

Uma barreira é um ponto em que várias gorrotinas param, e nenhuma segue até a última chegar.

Ela também aparece como _barrier_, e quando são só duas gorrotinas o nome é _rendezvous_, o encontro marcado.

Em Go a barreira é um `sync.WaitGroup` com `Add(n)`, em que cada gorrotina chama `Done` ao chegar e `Wait` logo em seguida:

```go
func esperarTodas(n int) {
	var barreira sync.WaitGroup
	barreira.Add(n)

	var wg sync.WaitGroup
	for i := range n {
		wg.Go(func() {
			// andaime: escalona as chegadas para a saída ficar legível
			time.Sleep(time.Duration(i) * 50 * time.Millisecond)
			fmt.Printf("gorrotina %d: chegou à barreira\n", i+1)

			barreira.Done()
			barreira.Wait() // libera quando a última chamar Done
			fmt.Printf("gorrotina %d: passou a barreira\n", i+1)
		})
	}
	wg.Wait()
}

func main() {
	esperarTodas(4)
}
```

```bash
$ go run .
gorrotina 1: chegou à barreira
gorrotina 2: chegou à barreira
gorrotina 3: chegou à barreira
gorrotina 4: chegou à barreira
gorrotina 4: passou a barreira
gorrotina 3: passou a barreira
gorrotina 1: passou a barreira
gorrotina 2: passou a barreira
```

As quatro chegadas, em ordem por causa do `Sleep`, e só depois as quatro passagens, em ordem imprevisível.

Repare que cada gorrotina chama `Done` e depois `Wait`. Em todos os posts anteriores só a `main` chamava `Wait`, e as gorrotinas só eram esperadas. Aqui cada uma é esperada pelas outras e espera as outras, e o `Wait` pode ser chamado por quantas gorrotinas for preciso. Todas acordam juntas quando o contador zera.

Preste atenção na gorrotina 4. Ela chegou por último e foi a primeira a passar, e não precisou saber que era a última. O `Done` dela zerou o contador, e isto liberou todo mundo, inclusive ela.

São dois `WaitGroup` no código. A `barreira` é o padrão. O `wg` é só para a `main` não terminar antes das gorrotinas, como no fan-out.

## Mas e se eu inverter?

`Wait` antes de `Done` parece dar na mesma. Eu inverti:

```bash
$ go run .
fatal error: all goroutines are asleep - deadlock!
```

Todas param no `Wait` esperando o contador zerar, e nenhuma chegou a chamar o `Done` que zera. Logo, a ordem importa: primeiro aviso que cheguei, depois espero as outras.

## Mas e uma segunda rodada?

Se a segunda fase também termina em uma barreira, dá vontade de chamar `Done` e `Wait` de novo no mesmo `WaitGroup`. Eu chamei:

```bash
$ go run .
gorrotina 1: passou a rodada 1
panic: sync: negative WaitGroup counter
```

E Pam! O `WaitGroup` não volta a `n` sozinho. Depois da primeira rodada o contador está em zero, e o primeiro `Done` da segunda leva ele para -1.

Esta barreira serve para uma rodada só. Para repetir, é um `WaitGroup` novo por rodada, ou um `sync.Cond`, cujo `Broadcast` acorda todas as gorrotinas paradas no `Wait` dele. O `sync.Cond` não entra nesta série, mas o livro [Go Concurrency Distilled](https://antonz.org/go-concurrency-distilled/), do Anton Zhiyanov, de onde este padrão veio, tem um capítulo sobre ele.

## Mas por que não fechar um canal?

Fechar um canal também libera todo mundo de uma vez. Foi assim no [trabalhador](/posts/concorrencia-go-trabalhador/), com o `close(pronto)`, e é o que o `ctx.Done()` faz.

A diferença é que alguém precisa decidir a hora de fechar, e para isso precisa saber que todas chegaram. Na barreira ninguém decide. A última a chegar libera as outras sem saber que é a última.

## De onde veio o exemplo

O código está na pasta [`barreira`](https://github.com/cassiobotaro/concorrencia-go/tree/main/barreira) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste roda no `synctest` e confere que as quatro passagens vêm depois da quarta chegada, sem se importar com a ordem entre elas.

No próximo vem o primeiro a responder. A mesma consulta vai para várias réplicas, vale a primeira resposta e as outras são canceladas.

Lembre-se que o [semáforo](/posts/concorrencia-go-semaforo/) e a barreira são opostos. Um limita quantas passam por vez. A outra exige que todas cheguem para alguma passar.

Então é isso, pessoal!

Até a próxima!

{}'s
