+++
title = "Concorrência Go - Janela deslizante"
date = "2026-11-09"
publishDate = "2026-11-09"
description = "O consumidor atrasou e o valor de quatro segundos atrás já não interessa. Veja como manter só os mais recentes descartando o mais antigo, e como um canal nil liga e desliga um case do select."
slug = "concorrencia-go-janela-deslizante"
tags = ["go", "concorrência", "gorrotinas", "canais", "select", "sliding-window"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/janelas_deslizantes.mp4" titulo="Uma janela de três valores descartando o mais antigo quando o consumidor atrasa" >}}

Na [contrapressão](/posts/concorrencia-go-contrapressao/) o consumidor lento fazia o produtor esperar, e nada se perdia.

Mas nem todo valor merece esperar. Se o produtor é um sensor de posição e o consumidor atrasou quatro segundos, a leitura de quatro segundos atrás não serve mais. Interessa a mais nova.

## O que é uma janela deslizante

Uma janela deslizante guarda só os `n` valores mais recentes. Quando chega um novo e a janela está cheia, o mais antigo sai para dar lugar.

Ela também aparece como _drop-oldest buffer_. Não confunda com _ring buffer_, que é um jeito de guardar os dados. A janela é a regra de descarte.

Uma única gorrotina cuida da fila e reage no `select` ao que acontecer primeiro:

```go
func janelaDeslizante(entrada <-chan int, saida chan<- int, tamanho int) {
	defer close(saida)
	var fila []int

	for entrada != nil || len(fila) > 0 {
		// o case de envio só existe quando há algo na fila
		var envio chan<- int
		var cabeca int
		if len(fila) > 0 {
			envio = saida
			cabeca = fila[0]
		}

		select {
		case valor, ok := <-entrada:
			if !ok {
				// entrada fechada: daqui em diante só esvazia a fila
				entrada = nil
				continue
			}
			if len(fila) == tamanho {
				fmt.Printf("Janela Deslizante: Buffer cheio, descartou %v para adicionar %v.\n", fila[0], valor)
				fila = fila[1:]
			}
			fila = append(fila, valor)

		case envio <- cabeca:
			fmt.Printf("Janela Deslizante: Enviou %v para o consumidor.\n", cabeca)
			fila = fila[1:]
		}
	}
}
```

A `main` liga um produtor que manda um valor por segundo a um consumidor que leva quatro segundos em cada um, com uma janela de três:

```go
valores := sequenciaNumeros(ctx, 1, 10)
saida := make(chan int)
pronto := make(chan struct{})
go leitorLento(saida, pronto)
janelaDeslizante(valores, saida, 3)
<-pronto
```

```bash
$ go run .
Consumidor: Recebeu 1
Consumidor: Recebeu 2
Janela Deslizante: Buffer cheio, descartou 3 para adicionar 6.
Janela Deslizante: Buffer cheio, descartou 4 para adicionar 7.
Janela Deslizante: Buffer cheio, descartou 5 para adicionar 8.
Consumidor: Recebeu 6
Janela Deslizante: Buffer cheio, descartou 7 para adicionar 10.
Consumidor: Recebeu 8
Consumidor: Recebeu 9
Consumidor: Recebeu 10
```

O consumidor viu 1, 2, 6, 8, 9 e 10. Os outros quatro saíram pela janela enquanto ele estava ocupado, e o produtor nunca esperou.

Preste atenção que a ordem se manteve. O que a janela perde é valor, não sequência.

## Mas que canal `nil` é esse?

Olhe o `var envio chan<- int`. Quando a fila está vazia, ele fica `nil`, e um `case` com canal `nil` nunca é escolhido pelo `select`. Ou seja, o `case` de envio some enquanto não há o que enviar.

É o mesmo truque do [fan-in com select](/posts/concorrencia-go-fan-in/), e ele aparece de novo quando a entrada fecha. O `entrada = nil` desliga o `case` de leitura, e o laço continua só para esvaziar a fila.

Hummm 🤔 E se eu deixar o `case` de envio sempre ligado, mandando `saida <- cabeca` direto?

Rodei 20 vezes aqui. Em 12 delas o consumidor recebeu um 0 que nunca entrou na janela, porque `cabeca` é zero quando a fila está vazia. E às vezes nem isso:

```bash
panic: runtime error: slice bounds out of range [1:0]
```

É o `fila = fila[1:]` rodando com a fila vazia.

## Mas por que uma gorrotina só?

Repare que produtor e consumidor nunca tocam na `fila`. Só a gorrotina da janela lê e escreve nela, então não tem disputa e não precisa de _mutex_.

Uma versão anterior deste exemplo usava um canal com _buffer_ compartilhado por duas gorrotinas, e tinha uma corrida que de vez em quando travava o programa. Isto tem nome, gorrotina dona do estado, e ganha um post só para ela mais para frente na série.

## De onde veio o exemplo

O código está na pasta [`janelas_deslizantes`](https://github.com/cassiobotaro/concorrencia-go/tree/main/janelas_deslizantes) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste de lá dispensa o relógio: manda cinco valores sem ninguém ler a saída, e confere que a janela de três descartou o 1 e o 2.

Lembrando que o `fila[1:]` não libera memória na hora. O _array_ de apoio continua lá até um `append` realocar, o que não importa para uma janela de três, mas importa para uma de três milhões.

No próximo vem a requisição e resposta, em que a mensagem carrega o canal pelo qual quem pediu espera a resposta.

Então é isso, pessoal!

Até a próxima!

{}'s
