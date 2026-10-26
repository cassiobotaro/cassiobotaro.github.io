+++
title = "Concorrência Go - Combinar sinais de parada"
date = "2026-12-01"
publishDate = "2026-12-01"
description = "Uma gorrotina que precisa parar quando qualquer um de vários sinais chegar. Veja por que derivar contextos resolve a maior parte, como juntar o resto em um canal só, e os dois cuidados sem os quais isso dá pânico ou vaza."
slug = "concorrencia-go-combinar-sinais-de-parada"
tags = ["go", "concorrência", "gorrotinas", "canais", "context", "select", "or-channel"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/combinar_sinais_de_parada.mp4" titulo="Vários sinais de parada virando um canal só" >}}

Na [parada com confirmação](/posts/concorrencia-go-parada-com-confirmacao/) o sinal de parada vinha de um lugar só.

Mas um _handler_ HTTP precisa parar quando a requisição for cancelada, quando o processo receber um `SIGINT` ou quando um prazo global estourar. Três motivos, e vale o primeiro que chegar.

## Quando tudo é contexto

Em 2017, quando o livro _Concurrency in Go_ saiu, cada um desses motivos era um canal diferente. Hoje os três são contextos.

O da requisição sempre foi, é o `r.Context()`. O prazo é `context.WithTimeout`. E desde o Go 1.16 o `signal.NotifyContext` devolve um contexto que é cancelado quando o sinal do sistema chega.

Quando as origens são contextos, a resposta é derivar um do outro:

```go
ctx, pararNoSinal := signal.NotifyContext(context.Background(), os.Interrupt)
defer pararNoSinal()
ctx, cancelarRequisicao := context.WithCancel(ctx)
defer cancelarRequisicao()
ctx, cancelarPrazo := context.WithTimeout(ctx, 250*time.Millisecond)
defer cancelarPrazo()

trabalharAte(ctx.Done())
fmt.Println("contexto cancelado:", ctx.Err())
```

```bash
$ go run .
trabalhando...
trabalhando...
contexto cancelado: context deadline exceeded
```

O filho é cancelado quando o pai é, então a `trabalharAte` recebe um único canal e tem um único `case` de parada, não importa quantas origens existam.

Repare que a cadeia tem três `cancelar`. Chamar um `cancel()` mais de uma vez é seguro, só a primeira chamada faz efeito. E quando pai e filho têm prazo, vale o mais curto, porque o filho só encurta, nunca estende.

## Mas e o que não é contexto?

Sobra o que vem de fora do pacote `context`. O canal `pronto` de outra gorrotina, a saída de um gerador, qualquer `chan struct{}` fechado como sinal.

Para esses, a função `qualquer` combina os canais em um só, fechado quando o primeiro deles fechar:

```go
func qualquer(canais ...<-chan struct{}) <-chan struct{} {
	saida := make(chan struct{})
	var once sync.Once
	for _, c := range canais {
		go func() {
			select {
			case <-c:
				once.Do(func() { close(saida) })
			case <-saida:
				// outro sinal chegou primeiro: esta gorrotina termina
			}
		}()
	}
	return saida
}
```

Uma gorrotina por canal de entrada, e a primeira a acordar fecha a saída. Na segunda metade do exemplo a gorrotina para quando o contexto acabar ou quando um colega terminar, o que vier primeiro:

```go
colegaTerminou := make(chan struct{})
go func() {
	time.Sleep(150 * time.Millisecond)
	close(colegaTerminou)
}()

trabalharAte(qualquer(ctx.Done(), colegaTerminou))
fmt.Println("um dos sinais de parada chegou (aqui, o colega terminou)")
```

```bash
trabalhando...
um dos sinais de parada chegou (aqui, o colega terminou)
```

Preste atenção que o `ctx.Done()` entra na `qualquer` como um canal qualquer. O contexto vira só mais um sinal entre os outros.

## Mas por que o `sync.Once`?

O primeiro rascunho tinha só `close(saida)` dentro do `case`. Fechei três sinais ao mesmo tempo e rodei 50 vezes:

```bash
panic: close of closed channel
```

Em 40 delas. Duas gorrotinas acordam juntas, as duas tentam fechar a mesma saída, e fechar um canal duas vezes é pânico. O `once.Do` garante um único `close`.

## E o `case <-saida`?

Ele parece inútil. A gorrotina está ali para esperar `c`, por que olhar a própria saída?

Tirei o `case` e chamei a `qualquer` 100 vezes com três canais, fechando só um deles:

```bash
gorrotinas vivas depois de 100 chamadas: 201
```

Opa! A cada chamada, as duas gorrotinas dos canais que nunca fecharam ficaram presas esperando. Com o `case <-saida`, quando um sinal vence, as outras veem a saída fechada e terminam.

## De onde veio o exemplo

O código está em [`qualquer.go`](https://github.com/cassiobotaro/concorrencia-go/tree/main/cancelamento), na pasta `cancelamento` do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), dividindo a `main` com a parada com confirmação.

O _or-channel_, com esse nome, é do capítulo 4 do [Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941294/), da Katherine Cox-Buday. A versão de lá é recursiva, divide a lista ao meio. Funciona, e existe também a do `reflect.Select`, mas os Go Proverbs lembram que "_Clear is better than clever_" e "_Reflection is never clear_". Para duas ou três origens, um `select` explícito é o mais claro.

No próximo vem o _heartbeat_, para o caso em que ninguém mandou parar. O trabalhador emite sinal de vida, e o supervisor decide que ele morreu quando o sinal para.

Lembre-se que o _or-channel_ não é o _or-done-channel_ do mesmo livro, que embrulha a leitura de um canal para ela também respeitar um sinal de parada. E para o sentido inverso, ligar um contexto a algo que não entende contextos, existe o `context.AfterFunc` desde o Go 1.21.

Então é isso, pessoal!

Até a próxima!

{}'s
