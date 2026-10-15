+++
title = "Concorrência Go - Tee"
date = "2026-10-15"
publishDate = "2026-10-15"
description = "Dois consumidores e os dois precisam ver todos os valores. Veja como copiar um canal para vários, o que um consumidor lento faz com o resto, e o que se perde quando o tee decide não esperar."
slug = "concorrencia-go-tee"
tags = ["go", "concorrência", "gorrotinas", "canais", "tee", "broadcast", "timeout"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/tee.mp4" titulo="Cada valor de um canal copiado para todas as saídas" >}}

No [fan-out](/posts/concorrencia-go-fan-out/) cada valor ia para um trabalhador só.

Mas e quando os dois precisam ver tudo? Um grava no log e o outro atualiza uma métrica, por exemplo. Nenhum deles pode perder valor.

## O que é um tee

Um tee copia cada valor de um canal de entrada para todos os canais de saída. O nome vem do comando `tee` do Unix, que duplica o que recebe.

Ele também aparece como _broadcast_, mas não é um _pub/sub_, porque as saídas são fixas.

A implementação é um laço dentro do outro, com o mesmo `select` do [pipeline](/posts/concorrencia-go-pipeline/) em cada envio:

```go
func tee(ctx context.Context, entrada <-chan int, saidas ...chan<- int) {
	// fecha as saídas ao sair, tanto no fim da entrada quanto no cancelamento
	defer func() {
		for _, saida := range saidas {
			close(saida)
		}
	}()
	for valor := range entrada {
		for _, saida := range saidas {
			select {
			case saida <- valor:
			case <-ctx.Done():
				return
			}
		}
	}
}
```

Repare no `...chan<- int`. É o inverso do `<-chan int` que a série usou até aqui. São canais só de escrita, e o compilador impede o tee de ler de uma saída por engano.

E se um trabalhador parar de ler no meio, o `ctx.Done()` tira o tee do envio em vez de deixá-lo preso, junto com o gerador atrás dele.

O trabalhador é o do [fan-out](/posts/concorrencia-go-fan-out/), com a demora virando parâmetro. A `main` cria duas saídas, um trabalhador para cada uma, e manda a sequência para o tee:

```go
func trabalhador(id int, entrada <-chan int, demora time.Duration) {
	for valor := range entrada {
		fmt.Printf("id: %d valor: %d\n", id, valor)
		time.Sleep(demora)
	}
}

func main() {
	ctx, cancelar := context.WithCancel(context.Background())
	defer cancelar()

	saida1 := make(chan int)
	saida2 := make(chan int)

	var wg sync.WaitGroup
	wg.Go(func() { trabalhador(1, saida1, 0) })
	wg.Go(func() { trabalhador(2, saida2, 0) })

	tee(ctx, sequenciaNumeros(ctx, 1, 10), saida1, saida2)
	wg.Wait()
}
```

```bash
$ go run .
id: 2 valor: 1
id: 1 valor: 1
id: 1 valor: 2
...
id: 1 valor: 10
```

Preste atenção que agora cada valor aparece duas vezes, uma por trabalhador. No fan-out era o contrário, e esse é o jeito mais fácil de não confundir os dois.

## Mas e se um trabalhador for lento?

Os canais não têm _buffer_, então o `saida <- valor` só retorna quando o trabalhador daquela saída pegou o valor, e o tee só volta para a entrada depois de todas.

Vamos deixar o trabalhador 2 com 250 milissegundos por valor:

```diff
 	wg.Go(func() { trabalhador(1, saida1, 0) })
-	wg.Go(func() { trabalhador(2, saida2, 0) })
+	wg.Go(func() { trabalhador(2, saida2, 250*time.Millisecond) })
```

Rodei aqui e o programa levou 2,5 segundos. Opa! O trabalhador 1 não demora nada, mas imprimiu no mesmo ritmo do 2, e o gerador também ficou esperando.

Ou seja, ninguém perde mensagem, mas todos andam no passo do mais lento. Isto tem nome, contrapressão, e volta mais para frente na série.

## Mas e se eu não quiser esperar?

Dá para o tee desistir do envio depois de um tempo. O `select` de cada envio ganha mais um `case`, um `time.After`, e vence quem acontecer primeiro:

```diff
-func tee(ctx context.Context, entrada <-chan int, saidas ...chan<- int) {
+func teeComTimeout(ctx context.Context, entrada <-chan int, timeout time.Duration, saidas ...chan<- int) {
 ...
 	for valor := range entrada {
-		for _, saida := range saidas {
+		for i, saida := range saidas {
+			// um select por saída: vence o envio, o prazo ou o cancelamento
 			select {
 			case saida <- valor:
+			case <-time.After(timeout):
+				// avisa em vez de descartar em silêncio
+				fmt.Printf("tee: descarte por timeout, saida=%d valor=%d\n", i+1, valor)
 			case <-ctx.Done():
 				return
 			}
 		}
 	}
```

Com a sequência de 1 a 5 e o prazo em 100 milissegundos:

```go
teeComTimeout(ctx, sequenciaNumeros(ctx, 1, 5), 100*time.Millisecond, saida1, saida2)
```

Parte do que ia para o trabalhador 2 é descartada:

```bash
$ go run . | grep -v "id: 1"
id: 2 valor: 1
tee: descarte por timeout, saida=2 valor=2
tee: descarte por timeout, saida=2 valor=3
id: 2 valor: 4
tee: descarte por timeout, saida=2 valor=5
```

O trabalhador 2 viu só o 1 e o 4, e o programa inteiro levou meio segundo em vez de 1,25 segundos.

Porém repare no que foi trocado. A garantia do tee era que todo mundo vê tudo, e o trabalhador lento acabou de perder isso. Por isso o exemplo avisa cada descarte.

## De onde veio o exemplo

O código está na pasta [`tee`](https://github.com/cassiobotaro/concorrencia-go/tree/main/tee) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), com as duas versões e um teste que confere os descartes.

No próximo vem o fan-in, com vários canais virando um só.

Lembrando que até o Go 1.22 cada `time.After` dentro de laço deixava um temporizador vivo até disparar. Isto só mudou no Go 1.23, e desde que o `go.mod` declare `go 1.23` ou mais novo.

Então é isso, pessoal!

Até a próxima!

{}'s
