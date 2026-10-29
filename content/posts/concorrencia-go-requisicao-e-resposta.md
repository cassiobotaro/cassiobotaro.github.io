+++
title = "Concorrência Go - Requisição e resposta"
date = "2026-11-11"
publishDate = "2026-11-11"
description = "Um canal é um valor, então uma mensagem pode carregar o canal pelo qual quer a resposta. Veja como uma gorrotina vira um serviço, e por que uma vaga de buffer no canal de resposta separa um serviço que segue de um que trava."
slug = "concorrencia-go-requisicao-e-resposta"
tags = ["go", "concorrência", "gorrotinas", "canais", "request-response", "buffer"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/requisicao_resposta.mp4" titulo="Cada requisição carrega o canal pelo qual a resposta volta" >}}

Até aqui na série os dados só andaram em um sentido. Um gerador escreve, um trabalhador lê, um estágio repassa.

Mas e quando eu mando um pedido e quero a resposta de volta? Preciso de um canal de ida e outro de volta. E se o de volta fosse dentro do pedido?

## O que é requisição e resposta

Canais são valores como qualquer outro em Go. Dá para guardar em variável, passar como parâmetro e colocar dentro de uma `struct`.

Então quem pede inclui na mensagem o canal pelo qual quer a resposta, e fica lendo dele. Quem atende processa e responde no canal que veio na mensagem.

Ele também aparece como canal de resposta ou _RPC_ interno.

```go
type requisicao struct {
	valor    int
	resposta chan<- int
}

// atende uma requisição por vez e responde no canal que veio nela
func servico(entrada <-chan requisicao) {
	for req := range entrada {
		req.resposta <- req.valor * 2
	}
}

func main() {
	entrada := make(chan requisicao)
	pronto := make(chan struct{})
	go func() {
		servico(entrada)
		close(pronto)
	}()

	for i := range 5 {
		// um canal novo por requisição
		resposta := make(chan int, 1)
		entrada <- requisicao{valor: i, resposta: resposta}
		// fica parado até o serviço responder
		fmt.Println("resposta:", <-resposta)
	}

	close(entrada)
	<-pronto
}
```

```bash
$ go run .
resposta: 0
resposta: 2
resposta: 4
resposta: 6
resposta: 8
```

Repare no `chan<- int` do campo `resposta`. O serviço só escreve nele, e o compilador impede que ele leia a própria resposta por engano.

Preste atenção também no `make` dentro do laço. Cada requisição leva o seu canal, e é ele que diz para o serviço onde depositar a resposta, como um envelope com o endereço do remetente. Nenhuma variável é compartilhada, pedido e resposta viajam por canais.

## Mas por que a vaga no canal de resposta?

O `make(chan int, 1)` tem uma vaga de _buffer_. No exemplo ela nunca é usada, porque a `main` sempre lê a resposta. Dá vontade de tirar.

Eu tirei. E para parecer um serviço de verdade, deixei a primeira requisição demorar 200 milissegundos e quem pede desistir depois de 100, com um `select` e um `time.After`:

```bash
$ go run .
desisti de esperar a requisição 0
fatal error: all goroutines are asleep - deadlock!
```

Opa! Quem pediu desistiu, foi mandar a segunda requisição e o programa morreu.

O serviço terminou de processar a primeira, tentou responder, e ninguém estava lendo o canal. Como ele não tem vaga, o serviço ficou preso no envio, e a segunda requisição nunca foi atendida.

Com a vaga de volta:

```bash
$ go run . vaga
desisti de esperar a requisição 0
servico: respondeu 0
servico: respondeu 2
resposta: 2
servico: respondeu 4
resposta: 4
fim
```

O serviço deposita a resposta 0 na vaga, segue em frente, e as outras duas são atendidas. A resposta que ninguém leu vai embora junto com o canal, quando o coletor de lixo passar.

Logo, a vaga não é otimização. É o que impede uma desistência de quem pediu de travar o serviço para todo mundo.

## Restaurando a sequência

Na palestra [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide) o Rob Pike usa a mesma ideia para outra coisa. No [fan-in](/posts/concorrencia-go-fan-in/) os valores das entradas chegam misturados, e ele quer controlar o passo.

Cada mensagem carrega um canal `wait`, e quem produziu só manda a próxima depois que o leitor avisa, por esse canal, que terminou de processar a anterior. Ele chama isso de _restoring sequencing_, e é requisição e resposta com os papéis trocados: a resposta é só um "pode continuar".

## De onde veio o exemplo

O código está na pasta [`requisicao_resposta`](https://github.com/cassiobotaro/concorrencia-go/tree/main/requisicao_resposta) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste de lá roda a `main` inteira e confere as cinco respostas.

No próximo vem a gorrotina dona do estado. É este padrão com um mapa dentro do serviço, atendendo leituras e escritas por canais, e a versão com _mutex_ do lado para comparar.

Um canal por requisição é barato, mas se quem pede pode desistir, cada um deles precisa da vaga. Sem ela, basta uma desistência para parar o serviço.

Então é isso, pessoal!

Até a próxima!

{}'s
