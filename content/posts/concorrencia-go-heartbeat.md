+++
title = "Concorrência Go - Heartbeat"
date = "2026-12-02"
publishDate = "2026-12-02"
description = "Um trabalhador demorado e um trabalhador travado parecem iguais de fora. Veja como um sinal de vida a cada intervalo separa os dois, por que esse sinal é enviado sem bloquear, e o que o supervisor pode e não pode fazer depois de declarar a morte."
slug = "concorrencia-go-heartbeat"
tags = ["go", "concorrência", "gorrotinas", "canais", "select", "timeout", "heartbeat"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/batimento.mp4" titulo="Um trabalhador emitindo sinal de vida e um supervisor esperando por ele" >}}

Um trabalhador leva três intervalos e meio para produzir cada resultado. O supervisor lê os resultados e, se ficar dois intervalos sem notícia, declara que ele morreu.

Rodei aqui:

```bash
$ go run .
trabalhador não responde
```

Opa! Ele não morreu, só estava demorando. O supervisor nem viu o primeiro resultado.

E se eu aumentar o prazo para quatro intervalos? Então um trabalhador travado de verdade só é descoberto depois de quatro intervalos, e se amanhã o trabalho ficar mais lento, volto ao mesmo problema. De fora, demorado e travado parecem iguais.

## O que é um heartbeat

Um _heartbeat_ é um sinal que o trabalhador emite em um canal a cada intervalo, enquanto trabalha, para dizer que continua vivo.

Ele também aparece como sinal de vida ou _liveness_. A forma daqui segue a do livro [Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941294/), da Katherine Cox-Buday.

O trabalhador devolve dois canais, um de batimentos e um de resultados. Dentro dele, um `Ticker` para o pulso e outro para o trabalho, e no terceiro resultado ele trava de propósito:

```go
for i := 1; ; {
	select {
	case <-ctx.Done():
		return
	case <-pulso.C:
		// envio não bloqueante: se ninguém ouve, o batimento se perde
		select {
		case batimento <- struct{}{}:
		default:
		}
	case <-trabalho.C:
		if i == 3 {
			// simula um travamento
			time.Sleep(travamento)
		}
		select {
		case resultados <- i:
			i++
		case <-ctx.Done():
			return
		}
	}
}
```

E o supervisor ouve os dois canais com o mesmo prazo de dois intervalos:

```go
func supervisor(intervalo, travamento time.Duration) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	batimento, resultados := trabalhador(ctx, intervalo, travamento)

	for {
		select {
		case <-batimento:
			fmt.Println("batimento")
		case r := <-resultados:
			fmt.Println("resultado:", r)
		case <-time.After(2 * intervalo):
			fmt.Println("trabalhador não responde")
			return
		}
	}
}
```

```bash
$ go run .
batimento
batimento
batimento
resultado: 1
batimento
batimento
batimento
batimento
resultado: 2
batimento
batimento
batimento
trabalhador não responde
```

Agora os dois primeiros resultados chegam, porque entre um e outro os batimentos mantêm o supervisor tranquilo. Depois do segundo, três batimentos e silêncio. O trabalhador travou no terceiro, e dois intervalos depois o supervisor avisa.

Repare no `time.After` dentro do laço. Ele é recriado a cada volta, como no [tee com timeout](/posts/concorrencia-go-tee/), então qualquer batimento ou resultado renova o prazo. O prazo não é "dois intervalos desde o começo", é "dois intervalos desde a última notícia".

## Mas por que o `select` com `default` no batimento?

Minha primeira versão mandava `batimento <- struct{}{}` direto, e o supervisor ouvia só os resultados:

```bash
$ go run .
trabalhador não responde
```

O trabalhador ficou preso no primeiro batimento, esperando alguém ler, e nunca chegou a produzir o resultado 1. Um trabalhador saudável declarado morto por causa do próprio sinal de vida.

Com o `default`, se ninguém estiver ouvindo naquele instante, o sinal se perde e o trabalho segue.

## E depois de declarar morto?

Preste atenção no `defer cancel()` do supervisor. Ao sair, ele cancela o contexto, e se o trabalhador voltar a responder, encontra o `ctx.Done()` e termina.

Porém o supervisor não espera por ele. Um trabalhador travado de verdade pode nunca voltar, e o Go não tem como matar uma gorrotina de fora. O cancelamento é um pedido, e quem está preso em um `Sleep`, em uma chamada de rede sem prazo ou em um laço sem `select` não vai ouvir.

Logo, o que o supervisor pode fazer é avisar, cancelar e seguir. O trabalhador travado continua lá, e é o caso que o perfil `goroutineleak`, que existe desde o Go 1.27, ajuda a encontrar.

## De onde veio o exemplo

O código está na pasta [`batimento`](https://github.com/cassiobotaro/concorrencia-go/tree/main/batimento) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste roda no `synctest`, e como o trabalhador travado está em um `Sleep`, o teste cancela e espera ele acordar e fechar o canal, porque a bolha exige que toda gorrotina termine.

Lembrando que o intervalo do batimento e o prazo do supervisor são dois chutes que precisam combinar. Um prazo de dois intervalos tolera um batimento perdido. Um prazo de um intervalo declara morto qualquer trabalhador que soluce.

No próximo vem o último da série, a corrente. Dez mil gorrotinas em fila passando um número adiante, só para ver quanto uma gorrotina custa.

Então é isso, pessoal!

Até a próxima!

{}'s
