+++
title = "Concorrência Go - Fan-out"
date = "2026-10-13"
publishDate = "2026-10-13"
description = "Um trabalhador lento segura a fila inteira. Veja o que acontece quando três gorrotinas leem do mesmo canal, quem decide qual valor vai para qual delas, e por que um WaitGroup conta melhor que um canal."
slug = "concorrencia-go-fan-out"
tags = ["go", "concorrência", "gorrotinas", "canais", "fan-out", "waitgroup"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/fan_out.mp4" titulo="Três trabalhadores dividindo os valores de um mesmo canal" >}}

No [trabalhador](/posts/concorrencia-go-trabalhador/) o `fmt.Printf` fazia o papel do processamento. Agora vamos fingir que ele demora.

Um `time.Sleep` de 100 milissegundos por valor. São dez valores, ou seja, um segundo parado olhando para a tela.

E se eu colocar três trabalhadores lendo do mesmo canal?

## O que é um fan-out

Um fan-out distribui os valores de um canal entre várias gorrotinas. Cada valor vai para uma só delas, e com isso um trabalho demorado se divide entre quem estiver livre.

Ele também aparece como distribuição de trabalho ou _work distribution_. O artigo [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines) define assim: múltiplas funções lendo do mesmo canal até ele ser fechado.

O trabalhador ganhou um `id` para a gente saber quem pegou o quê:

```go
func trabalhador(id int, entrada <-chan int) {
	for valor := range entrada {
		fmt.Printf("id: %d processando valor: %v\n", id, valor)
		// simula um processamento demorado
		time.Sleep(100 * time.Millisecond)
	}
}

func fanout(entrada <-chan int, n int) {
	var wg sync.WaitGroup
	for i := range n {
		wg.Go(func() {
			trabalhador(i+1, entrada)
		})
	}
	// só retorna quando os n trabalhadores terminarem
	wg.Wait()
}
```

A `sequenciaNumeros` é a mesma dos geradores, e a `main` manda os dez valores para três trabalhadores:

```go
func main() {
	ctx, cancelar := context.WithCancel(context.Background())
	defer cancelar()

	fanout(sequenciaNumeros(ctx, 1, 10), 3)
}
```

```bash
$ go run .
id: 3 processando valor: 1
id: 1 processando valor: 2
id: 2 processando valor: 3
id: 1 processando valor: 5
id: 2 processando valor: 4
id: 3 processando valor: 6
id: 2 processando valor: 7
id: 3 processando valor: 8
id: 1 processando valor: 9
id: 2 processando valor: 10
```

Preste atenção nos valores. Nenhum aparece duas vezes, e nenhum ficou de fora.

Rodei aqui com um trabalhador e com três. Um segundo contra 400 milissegundos.

## Mas quem decide qual valor vai para qual trabalhador?

Ninguém. Repare que não existe uma linha de código escolhendo o trabalhador, nem um índice, nem um sorteio.

Quando várias gorrotinas estão paradas lendo o mesmo canal, cada envio é entregue a uma só delas. Quem estiver livre primeiro, recebe. O canal já faz a distribuição, e o `fanout` só precisa disparar as gorrotinas.

## Mas o que é esse `WaitGroup`?

No post do trabalhador a `main` esperava um `<-pronto` para saber que ele tinha acabado. Com três trabalhadores seriam três canais, ou três leituras do mesmo. E se forem cinquenta?

O `sync.WaitGroup` é um contador. O `wg.Go` dispara a gorrotina e soma um, e quando ela retorna ele subtrai. O `wg.Wait()` fica parado até o contador chegar a zero.

Hummm 🤔 Mas a série inteira não era sobre canais?

Era, e continua sendo. Os canais estão levando os dados, que é o trabalho deles. Contar quantas gorrotinas já terminaram é um problema menor, e para esses o Rob Pike recomenda o pacote `sync`. Na palestra [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide) ele avisa "_Don't overdo it_", porque às vezes só é preciso um contador.

Daqui para frente na série os canais transportam os dados e o `WaitGroup` só conta quem terminou.

## Rode mais uma vez

Rodei de novo e a saída mudou:

```bash
$ go run .
id: 3 processando valor: 2
id: 2 processando valor: 3
id: 1 processando valor: 1
id: 1 processando valor: 4
...
```

Os três trabalhadores concorrem pelos valores, e quem decide qual deles roda em cada momento é o escalonador do Go, não você.

É a primeira vez na série que a ordem dos valores muda de uma execução para outra. O Rob Pike explica isto na palestra [Concurrency is not parallelism](https://go.dev/blog/waza-talk). O programa descreve computações independentes, mas não diz em que ordem elas executam. Logo, se o seu programa só funciona com uma ordem específica, ele está errado, mesmo que passe no teste hoje.

## De onde veio o exemplo

O código está na pasta [`fan_out`](https://github.com/cassiobotaro/concorrencia-go/tree/main/fan_out) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste de lá usa um trabalhador só, justamente porque com três a ordem muda a cada execução.

No próximo vem o tee, que é fácil de confundir com este. No fan-out cada valor vai para um trabalhador. No tee cada valor é copiado para todos.

Lembre-se que o `wg.Go` só existe a partir do Go 1.25. Antes dele era `wg.Add(1)` antes do `go` e `defer wg.Done()` dentro da gorrotina.

Então é isso, pessoal!

Até a próxima!

{}'s
