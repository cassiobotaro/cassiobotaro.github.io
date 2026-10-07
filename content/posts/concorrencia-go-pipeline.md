+++
title = "Concorrência Go - Pipeline"
date = "2026-10-08"
publishDate = "2026-10-08"
description = "Um estágio lê de um canal, transforma o valor e escreve em outro. Veja como um único close na ponta encerra a cadeia inteira, e por que o mesmo contexto precisa atravessar todos os estágios para ninguém ficar preso."
slug = "concorrencia-go-pipeline"
tags = ["go", "concorrência", "gorrotinas", "canais", "pipeline", "context"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/pipeline.mp4" titulo="Estágios encadeados por canais, cada um transformando o que recebe" >}}

No [gerador](/posts/concorrencia-go-geradores/) uma gorrotina escrevia no canal. No [trabalhador](/posts/concorrencia-go-trabalhador/) ela lia.

E se ela fizer os dois? Lê de um canal, transforma o valor e escreve em outro.

## O que é um pipeline

Um _pipeline_ é uma cadeia de estágios ligados por canais. Cada estágio (_stage_) é uma função que recebe um canal, dispara uma gorrotina para ler dele e devolve o canal onde escreve o resultado.

Ou seja, cada estágio é trabalhador de quem vem antes e gerador para quem vem depois.

Vamos começar com um estágio que dobra o que recebe:

```go
func dobro(entrada <-chan int) <-chan int {
	saida := make(chan int)
	go func() {
		for valor := range entrada {
			saida <- valor * 2
		}
		// quando a entrada fecha, a saída fecha também
		close(saida)
	}()
	return saida
}
```

Repare na assinatura. A `dobro` recebe um `<-chan int` e devolve outro `<-chan int`. Como a saída tem o mesmo tipo da entrada, você pode encaixar um `dobro` dentro do outro:

```go
func main() {
	for valor := range dobro(dobro(sequenciaNumeros(1, 10))) {
		fmt.Printf("valor: %v\n", valor)
	}
}
```

A `sequenciaNumeros` é a mesma do post dos geradores, por enquanto sem contexto. Ela gera de 1 a 10, o primeiro `dobro` multiplica por dois e o segundo multiplica de novo:

```bash
$ go run .
valor: 4
valor: 8
...
valor: 40
```

São três gorrotinas trabalhando ao mesmo tempo, e cada canal carrega um valor por vez.

## Mas quem fechou o canal da main?

Repare que a `main` não fechou canal nenhum, e mesmo assim o `range` dela terminou.

Quem fechou foi o gerador, depois de mandar o 10. O `range` do primeiro `dobro` terminou, ele fechou a própria saída, o `range` do segundo terminou, fechou a dele, e o `range` da `main` acabou.

Logo, um `close` na ponta de cima encerra a cadeia inteira, e cada estágio só precisa fechar o canal que ele mesmo criou.

## E se eu parar de ler no meio?

E se, como no gerador, eu der um `break` no meio?

Parei no primeiro valor e contei quem ficou vivo:

```go
for valor := range dobro(dobro(sequenciaNumeros(1, 10))) {
	if valor == 8 {
		break
	}
	fmt.Printf("valor: %v\n", valor)
}
fmt.Println("gorrotinas vivas:", runtime.NumGoroutine())
// valor: 4
// gorrotinas vivas: 4
```

Opa! A `main` é uma. As outras três são o gerador e os dois estágios, cada um parado em um envio que ninguém vai ler.

No gerador ficava uma gorrotina para trás. Aqui fica uma por estágio, e quanto mais comprido o _pipeline_, mais gorrotinas sobram.

## A solução

A solução é a mesma do gerador, um `context.Context`. A diferença é que ele precisa atravessar a cadeia inteira:

```diff
-func dobro(entrada <-chan int) <-chan int {
+func dobro(ctx context.Context, entrada <-chan int) <-chan int {
 	saida := make(chan int)
 	go func() {
+		defer close(saida)
 		for valor := range entrada {
-			saida <- valor * 2
+			select {
+			case saida <- valor * 2:
+			case <-ctx.Done():
+				return
+			}
 		}
-		// quando a entrada fecha, a saída fecha também
-		close(saida)
 	}()
 	return saida
 }
```

A `sequenciaNumeros` volta a ser a versão com contexto do post dos geradores, e a `main` passa o mesmo `ctx` para os três:

```go
ctx, cancelar := context.WithCancel(context.Background())
valores := dobro(ctx, dobro(ctx, sequenciaNumeros(ctx, 1, 10)))
for valor := range valores {
	if valor == 8 {
		break
	}
	fmt.Printf("valor: %v\n", valor)
}
cancelar()
// drena até o último estágio fechar
for range valores {
}
fmt.Println("pipeline encerrado")
// valor: 4
// pipeline encerrado
```

Um único `cancelar()` e as três gorrotinas vão embora. Cada uma sai pelo `ctx.Done()`, sem depender de o estágio seguinte voltar a ler, e fecha o canal que criou no `defer`.

É o que o artigo [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines), do Sameer Ajmani, chama de cancelamento explícito.

## E quando um estágio dá erro?

O exemplo não trata erro, e não existe um jeito só de fazer isso. O estágio pode devolver um segundo canal só de erros e parar no primeiro, ou mandar o erro junto com o valor em uma `struct` e deixar quem lê decidir. Também dá para o estágio receber um canal de erros e seguir em frente.

Acho que depende de um erro dever ou não parar os outros estágios, e isto volta mais para frente na série, quando chegarmos ao semáforo.

## De onde veio o exemplo

O código está na pasta [`pipeline`](https://github.com/cassiobotaro/concorrencia-go/tree/main/pipeline) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), com o teste que confere os dez valores multiplicados por quatro.

No próximo vem o _fan-out_. Quando um estágio só não dá conta, vários trabalhadores leem do mesmo canal.

Lembrando que se o `ctx` entra na cadeia, ele entra em todos os estágios. Basta um ficar de fora para ele ficar preso no envio.

Então é isso, pessoal!

Até a próxima!

{}'s
