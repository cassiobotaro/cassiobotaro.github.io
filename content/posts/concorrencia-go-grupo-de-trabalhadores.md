+++
title = "Concorrência Go - Grupo de trabalhadores"
date = "2026-10-22"
publishDate = "2026-10-22"
description = "Um número fixo de gorrotinas divide a entrada e junta os resultados em um canal só. Veja como o fan-out e o fan-in viram um padrão só, e por que sem o contexto o grupo inteiro fica preso com um resultado na mão."
slug = "concorrencia-go-grupo-de-trabalhadores"
tags = ["go", "concorrência", "gorrotinas", "canais", "worker-pool", "waitgroup", "context"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/grupo.mp4" titulo="Dois trabalhadores dividindo a entrada e juntando os resultados em uma única saída" >}}

No [fan-out](/posts/concorrencia-go-fan-out/) três trabalhadores dividiam um canal, mas o resultado morria em um `fmt.Printf`. No [fan-in](/posts/concorrencia-go-fan-in/) várias gorrotinas escreviam no mesmo canal de saída.

E se eu juntar os dois? Vários trabalhadores lendo da mesma entrada e escrevendo o resultado na mesma saída.

## O que é um grupo de trabalhadores

Um grupo de trabalhadores é um número fixo de gorrotinas que esperam valores em um canal de entrada. Cada uma processa o que pegou, escreve o resultado em um canal de saída e volta para a fila.

Ele também aparece como _worker pool_ ou _pool_ de gorrotinas. Aqui em casa minha esposa chama de piscina de marmotinhas, e confesso que o nome pegou.

O trabalhador é o do fan-out, mas agora com uma saída:

```go
func trabalhador(ctx context.Context, id int, entrada <-chan int, saida chan<- int) {
	for valor := range entrada {
		fmt.Printf("id: %d processou valor: %v\n", id, valor)
		select {
		case saida <- valor * 2:
		case <-ctx.Done():
			return
		}
	}
	fmt.Printf("id: %d terminou\n", id)
}
```

E o grupo dispara `n` deles e devolve a saída:

```go
func grupoDeTrabalhadores(ctx context.Context, entrada <-chan int, n int) <-chan int {
	saida := make(chan int)
	var wg sync.WaitGroup

	for i := range n {
		wg.Go(func() {
			trabalhador(ctx, i+1, entrada, saida)
		})
	}

	// quando todos terminarem, fecha a saída
	go func() {
		wg.Wait()
		close(saida)
	}()

	return saida
}
```

A `sequenciaNumeros` é a dos [geradores](/posts/concorrencia-go-geradores/), e a `main` manda dez valores para dois trabalhadores:

```go
func main() {
	ctx, cancelar := context.WithCancel(context.Background())
	defer cancelar()

	saida := grupoDeTrabalhadores(ctx, sequenciaNumeros(ctx, 1, 10), 2)
	for resultado := range saida {
		fmt.Println(resultado)
	}
}
```

```bash
$ go run .
id: 1 processou valor: 1
id: 1 processou valor: 3
2
6
id: 2 processou valor: 2
4
...
id: 2 terminou
id: 1 terminou
```

Os dez resultados aparecem, dobrados e fora de ordem, como no fan-out.

Repare que o `trabalhador` nem sabe que o `WaitGroup` existe. Ele lê, processa e escreve. Quem o disparou é que conta quem terminou, e é a mesma gorrotina do fan-in que espera no `wg.Wait()` para fechar a saída.

## Mas isto não é o fan-out?

Na entrada, é. Várias gorrotinas lendo do mesmo canal, e o canal entregando cada valor a uma só.

A diferença está na saída. O fan-out só distribuía o trabalho, e o grupo também junta os resultados em um canal só, que é exatamente o que o fan-in fazia.

Logo, o grupo de trabalhadores é um fan-out na entrada e um fan-in na saída. Nada novo, os dois padrões emendados.

## Mas por que o select no envio?

Dá vontade de escrever só `saida <- valor * 2` no trabalhador. Eu escrevi, e depois parei de ler a saída no meio, como já fiz no [pipeline](/posts/concorrencia-go-pipeline/):

```go
for resultado := range saida {
	fmt.Println(resultado)
	break
}
cancelar()
```

Rodei 200 vezes aqui e em 170 ficaram quatro gorrotinas vivas: a `main`, os dois trabalhadores e a que espera no `wg.Wait()`.

O `cancelar()` encerra o gerador, mas cada trabalhador já pegou um valor e está parado no `saida <- valor * 2`, esperando alguém ler. Ninguém vai ler. O `WaitGroup` nunca chega a zero, a saída nunca fecha, e a gorrotina do `wg.Wait()` fica presa junto.

Com o `select`, o `ctx.Done()` tira os trabalhadores do envio, o contador zera e a saída é fechada do mesmo jeito. Nas 200 execuções sobrou só a `main`.

É a pulga atrás da orelha do [olá mundo](/posts/concorrencia-go-ola-mundo/), o vazamento de gorrotinas. Com um trabalhador só era uma gorrotina presa. Aqui é o grupo inteiro.

## De onde veio o exemplo

O código está na pasta [`grupo`](https://github.com/cassiobotaro/concorrencia-go/tree/main/grupo) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste de lá usa um trabalhador só, pelo mesmo motivo do fan-out.

No próximo vem a contrapressão, que apareceu de relance no [tee](/posts/concorrencia-go-tee/), quando todo mundo andava no passo do trabalhador mais lento.

Lembre-se que quantos trabalhadores colocar no grupo depende do que eles fazem. Para contas pesadas, mais trabalhadores que núcleos não ajuda. Para esperar rede ou disco, pode ser bem mais, porque a maior parte do tempo eles ficam parados.

Então é isso, pessoal!

Até a próxima!

{}'s
