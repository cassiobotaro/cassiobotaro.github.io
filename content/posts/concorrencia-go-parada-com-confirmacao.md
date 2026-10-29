+++
title = "Concorrência Go - Parada com confirmação"
date = "2026-11-25"
publishDate = "2026-11-25"
description = "Cancelar o contexto manda parar, mas não diz que parou. Veja o que se perde quando a main não espera, como o errgroup traz a confirmação de volta, e o que o context faz e o que ele não faz."
slug = "concorrencia-go-parada-com-confirmacao"
tags = ["go", "concorrência", "gorrotinas", "context", "errgroup", "cancelamento"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/parada_com_confirmacao.mp4" titulo="O pedido de parada descendo pelo contexto e a confirmação subindo de volta" >}}

Desde os [geradores](/posts/concorrencia-go-geradores/) a série inteira usa o `ctx.Done()` para mandar uma gorrotina parar.

Mas mandar parar não quer dizer que parou. Se o gerador tem um arquivo aberto ou uma conexão para fechar, o que acontece com isso?

## Cancelei, e agora?

Dei ao gerador uma limpeza de 100 milissegundos ao ver o `ctx.Done()`, e na `main` chamei `cancelar()` e terminei, sem esperar nada. Rodei 20 vezes:

```bash
$ go run .
main: fim
```

Vinte vezes a mesma coisa. Nem o "liberando recursos..." apareceu.

É o [olá mundo](/posts/concorrencia-go-ola-mundo/) de novo. O `cancelar()` acordou a gorrotina, mas a `main` terminou antes de ela dar um passo, e levou a limpeza junto. Arquivo aberto, conexão pendurada, e ninguém ficou sabendo.

## O que é parada com confirmação

Quem pede a parada espera a gorrotina confirmar que parou, e só então segue.

Ela também aparece como _shutdown_ com _ack_ ou _graceful stop_.

Nas palestras isto era feito à mão: o Rob Pike, em [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide), responde no próprio canal `quit`, e o Sameer Ajmani, em [Advanced Go Concurrency Patterns](https://go.dev/talks/2013/advconc.slide), usa a [requisição e resposta](/posts/concorrencia-go-requisicao-e-resposta/) com um `chan chan error`.

O `context` só faz a metade de baixo. Ele leva o sinal de quem chama para quem é chamado, e nunca traz nada de volta. Para a metade de cima, o costume hoje é juntar o `context` com o `errgroup` do [semáforo](/posts/concorrencia-go-semaforo/):

```go
func tagarelaComContext(ctx context.Context, nome string, saida chan<- string) error {
	for i := 0; ; i++ {
		select {
		case saida <- fmt.Sprintf("%s %d", nome, i):
		case <-ctx.Done():
			limpeza()
			// a confirmação é o próprio retorno
			return ctx.Err()
		}
	}
}

func paradaComErrgroup() {
	ctx, cancelar := context.WithCancel(context.Background())
	saida := make(chan string)

	var g errgroup.Group
	g.Go(func() error { return tagarelaComContext(ctx, "Bia", saida) })

	for range 3 {
		fmt.Println(<-saida)
	}
	// o pedido desce pelo contexto e a resposta sobe pelo errgroup
	cancelar()
	fmt.Println("gerador:", g.Wait())
}
```

> :warning: O `errgroup` fica fora da biblioteca padrão. Instale com `go get golang.org/x/sync/errgroup`.

```bash
$ go run .
Bia 0
Bia 1
Bia 2
gerador: liberando recursos...
gerador: context canceled
```

Agora o "liberando recursos..." aparece em todas as execuções, e a `main` só segue depois dele.

Repare na ordem das duas últimas linhas da `paradaComErrgroup`. O `cancelar()` manda parar, e o `g.Wait()` bloqueia até a gorrotina retornar e entrega o que ela devolveu. É o `Close` do Ajmani em duas chamadas, sem canal de resposta escrito à mão.

## Mas o `errgroup` não era para erros?

Era, e continua sendo. Aqui o erro é a confirmação.

O `context canceled` que apareceu na saída é o `ctx.Err()` devolvido pelo gerador, ou seja, "parei, e parei porque você mandou". Se a limpeza falhasse ao fechar o arquivo, o gerador devolveria esse erro no lugar, e a `main` ficaria sabendo pelo mesmo `g.Wait()`.

Hummm 🤔 E se eu quiser dizer o motivo da parada?

Para isto existe o `context.WithCancelCause`, desde o Go 1.20. Quem cancela passa um erro, e a gorrotina lê com `context.Cause(ctx)`. Porém isto é informação descendo, e não substitui a confirmação, que sobe.

## De onde veio o exemplo

O código está na pasta [`cancelamento`](https://github.com/cassiobotaro/concorrencia-go/tree/main/cancelamento) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), que divide a `main` com o próximo padrão da série. O `time.Sleep` dentro da `limpeza` é andaime, está ali para a liberação levar um tempo visível.

No próximo vem o combinar sinais de parada. Uma gorrotina que precisa parar quando qualquer um de vários sinais chegar, e o que fazer quando nem todos são contextos.

Lembrando que o `context` só entrou na biblioteca padrão no Go 1.7, em 2016, depois das duas palestras. O que ele padronizou foi só o canal `quit` fechado para avisar todo mundo. O resto, como esta confirmação, continua escrito à mão.

Então é isso, pessoal!

Até a próxima!

{}'s
