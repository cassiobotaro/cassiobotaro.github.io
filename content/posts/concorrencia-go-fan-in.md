+++
title = "Concorrência Go - Fan-in"
date = "2026-10-20"
publishDate = "2026-10-20"
description = "Três canais de entrada e um único range para ler tudo. Veja por que fechar a saída é a parte difícil, o que acontece quando cada gorrotina fecha por conta própria, e quando um select sozinho resolve."
slug = "concorrencia-go-fan-in"
tags = ["go", "concorrência", "gorrotinas", "canais", "fan-in", "waitgroup", "select"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/fan_in.mp4" titulo="Vários canais de entrada combinados em um único canal de saída" >}}

No [tee](/posts/concorrencia-go-tee/) um canal virava várias cópias. No [fan-out](/posts/concorrencia-go-fan-out/) um canal virava vários trabalhadores.

Agora é o caminho contrário. Tenho três geradores e quero ler tudo com um único `range`.

## O que é um fan-in

Um fan-in copia os valores de vários canais de entrada para um único canal de saída.

Ele também aparece como _merge_, e o Rob Pike chama de multiplexação na palestra [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide).

A primeira tentativa é uma gorrotina por entrada, todas escrevendo na mesma saída:

```go
func fanin(entradas ...<-chan int) <-chan int {
	saida := make(chan int)
	for _, entrada := range entradas {
		go func() {
			for valor := range entrada {
				saida <- valor
			}
		}()
	}
	return saida
}

func main() {
	canal := fanin(
		sequenciaNumeros(1, 10),
		sequenciaNumeros(11, 20),
		sequenciaNumeros(21, 30),
	)
	for valor := range canal {
		fmt.Printf("valor: %v\n", valor)
	}
}
```

A `sequenciaNumeros` é a do post dos [geradores](/posts/concorrencia-go-geradores/), por enquanto sem contexto.

```bash
$ go run .
valor: 21
valor: 22
valor: 1
...
valor: 10
fatal error: all goroutines are asleep - deadlock!
```

Os trinta valores apareceram, misturados como no fan-out, e no fim o programa morreu.

Repare que ninguém fecha a `saida`, e o `range` da `main` fica esperando um trigésimo primeiro valor que nunca vem.

## Mas é só fechar, neh?

Cada gorrotina sabe quando a entrada dela acabou. Então ela fecha a saída:

```diff
 		go func() {
 			for valor := range entrada {
 				saida <- valor
 			}
+			// acabou a minha entrada, fecho a saída
+			close(saida)
 		}()
```

Rodei 100 vezes aqui. Em 6 delas saíram os trinta valores. Em 58 o programa terminou sem erro nenhum, mas faltando valor. E nas outras 36, E Pam!

```bash
panic: send on closed channel
```

![Gopher em pânico](/images/gopher-panic.png "Pane no sistema")

São três gorrotinas e um canal só. A primeira que termina fecha a saída, o `range` da `main` acaba e o programa encerra levando o que faltava junto. Se alguma das outras ainda tentar enviar, é _panic_.

O pior caso é o do meio. Um _panic_ você vê, valor sumindo em silêncio não.

## A solução

A saída só pode ser fechada depois que a última entrada acabar, e por uma gorrotina só. Contar quem terminou é exatamente o trabalho do `sync.WaitGroup` que apareceu no fan-out:

```go
func fanin(entradas ...<-chan int) <-chan int {
	saida := make(chan int)
	var wg sync.WaitGroup

	for _, entrada := range entradas {
		wg.Go(func() {
			for valor := range entrada {
				saida <- valor
			}
		})
	}

	// quando todas as entradas terminarem, fecha a saída
	go func() {
		wg.Wait()
		close(saida)
	}()

	return saida
}
```

Preste atenção na gorrotina do final. Por que não chamar o `wg.Wait()` direto antes do `return`? Porque a `main` ainda nem recebeu o canal, e as gorrotinas ficariam paradas enviando para ninguém. _Deadlock_ de novo.

Agora os trinta valores aparecem em todas as execuções.

## E o contexto?

Se a `main` der um `break` no meio, o problema do [pipeline](/posts/concorrencia-go-pipeline/) volta, e aqui não basta cancelar os geradores. A gorrotina do fan-in que já pegou um valor fica parada no `saida <- valor` com ele na mão, o `WaitGroup` nunca chega a zero e a saída nunca fecha.

Logo, o `ctx` entra no fan-in também, e cada `saida <- valor` vira o mesmo `select` com `ctx.Done()` do pipeline.

## Mas e se forem só duas entradas?

Na mesma palestra o Rob Pike mostra uma versão com uma única gorrotina e um `select`, que repassa o valor de quem estiver pronto primeiro. A dele roda para sempre, esta trata o fechamento das entradas:

```go
func faninSelect(ctx context.Context, entrada1, entrada2 <-chan int) <-chan int {
	saida := make(chan int)
	go func() {
		defer close(saida)
		for entrada1 != nil || entrada2 != nil {
			var valor int
			var ok bool
			select {
			case valor, ok = <-entrada1:
				if !ok {
					entrada1 = nil
					continue
				}
			case valor, ok = <-entrada2:
				if !ok {
					entrada2 = nil
					continue
				}
			case <-ctx.Done():
				return
			}
			select {
			case saida <- valor:
			case <-ctx.Done():
				return
			}
		}
	}()
	return saida
}
```

O truque está no `entrada1 = nil`, que o Sameer Ajmani mostra na palestra [Advanced Go Concurrency Patterns](https://go.dev/talks/2013/advconc.slide). Ler de um canal `nil` bloqueia para sempre, então quando uma entrada fecha, o `case` dela some do `select`. Quando as duas viram `nil`, o laço termina.

E como só uma gorrotina escreve na saída, ela mesma fecha no `defer`, sem `WaitGroup`.

Porém os `case`s de um `select` são fixos no código. Com um _slice_ de canais, volta a ser uma gorrotina por entrada.

## De onde veio o exemplo

O código está na pasta [`fan_in`](https://github.com/cassiobotaro/concorrencia-go/tree/main/fan_in) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), com as duas versões.

No próximo vem o grupo de trabalhadores, que junta este com o fan-out.

Quem fecha um canal é quem escreve nele. Quando são várias gorrotinas escrevendo, alguém de fora precisa esperar todas antes de fechar.

Então é isso, pessoal!

Até a próxima!

{}'s
