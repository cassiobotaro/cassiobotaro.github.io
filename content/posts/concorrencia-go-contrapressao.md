+++
title = "Concorrência Go - Contrapressão"
date = "2026-10-27"
publishDate = "2026-10-27"
description = "Um consumidor lento e um produtor que não sabe disso. Veja como a capacidade de um canal freia o produtor sem uma linha de código a mais, o que o buffer muda de verdade, e o que fazer quando esperar não é opção."
slug = "concorrencia-go-contrapressao"
tags = ["go", "concorrência", "gorrotinas", "canais", "backpressure", "buffer"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/backpressure.mp4" titulo="Uma fila limitada entre o produtor e um consumidor lento" >}}

No [tee](/posts/concorrencia-go-tee/) um trabalhador de 250 milissegundos segurou o outro e o gerador junto, e o programa levou 2,5 segundos. Eu disse que aquilo tinha nome e que voltaria.

Voltou.

## O que é contrapressão

Contrapressão é quando um consumidor lento faz o produtor diminuir o ritmo, em vez de deixar o trabalho se acumular sem limite. Nada é descartado, e quem espera é o produtor.

Ela também aparece como _backpressure_ ou fila limitada (_bounded queue_).

Em Go isto já vem embutido nos canais. A capacidade do canal é a folga máxima entre quem produz e quem consome, e quando ela acaba, o envio bloqueia.

Vamos ver. O produtor gera dez valores o mais rápido que consegue e o consumidor leva 200 milissegundos em cada um:

```go
func produtor(saida chan<- int, n int) {
	defer close(saida)
	for i := 1; i <= n; i++ {
		// pergunta "dá para enviar agora?" sem bloquear
		select {
		case saida <- i:
		default:
			fmt.Printf("Produtor: fila cheia ao enviar %d\n", i)
			// e então envia do jeito normal, esperando
			saida <- i
		}
		fmt.Printf("Produtor: enviou %d\n", i)
	}
}

func consumidorLento(entrada <-chan int, pronto chan<- struct{}) {
	defer close(pronto)
	for valor := range entrada {
		fmt.Printf("Consumidor: processando %d\n", valor)
		time.Sleep(200 * time.Millisecond)
	}
}
```

E a `main` coloca uma fila de três posições entre os dois:

```go
func main() {
	fila := make(chan int, 3)
	pronto := make(chan struct{})

	go consumidorLento(fila, pronto)
	produtor(fila, 10)
	<-pronto
}
```

```bash
$ go run .
Produtor: enviou 1
Produtor: enviou 2
Produtor: enviou 3
Produtor: fila cheia ao enviar 4
Consumidor: processando 1
Produtor: enviou 4
Produtor: fila cheia ao enviar 5
Consumidor: processando 2
...
Consumidor: processando 10
```

Os três primeiros entram de uma vez. A partir do quarto, cada envio espera o consumidor tirar um da fila, ou seja, o produtor passou a andar a 200 milissegundos por valor.

Repare que o produtor não tem nenhuma linha esperando o consumidor. Ele só escreve no canal, e o canal cheio faz o resto.

O `select` com `default` está ali só para a gente enxergar a fila cheia. O `default` roda quando o envio não pode acontecer naquele instante, imprime o aviso e faz o envio bloqueante de sempre. Sem o `select` acontece a mesma coisa, em silêncio.

## Mas o buffer não deveria acelerar?

Hummm 🤔 Eu também achava. Tirei os `Printf`, medi quando o produtor termina de enviar e quando o programa termina, e variei a capacidade da fila:

```bash
$ go run . 0
Produtor: terminou de enviar em 1.8s
capacidade 0: fim em 2s
$ go run . 3
Produtor: terminou de enviar em 1.2s
capacidade 3: fim em 2s
$ go run . 100
Produtor: terminou de enviar em 0s
capacidade 100: fim em 2s
```

O programa leva 2 segundos nos três casos. São dez valores de 200 milissegundos e o consumidor é um só. O buffer não muda quanto tempo o trabalho leva, muda só quanto tempo o produtor fica esperando.

Com capacidade 100 ele nem esperou. Parece ótimo, mas os dez valores foram todos para a memória, e o consumidor continuou lá atrás no mesmo ritmo. Troque dez por dez milhões e a fila que "nunca enche" é justamente a que cresce sem controle.

Logo, o que a contrapressão te dá é um teto conhecido para a memória e nenhum valor perdido. O que ela te cobra é um produtor bloqueado.

## Mas e se o produtor não puder esperar?

Se quem produz é um _handler_ HTTP, bloquear é segurar a conexão de quem chamou. Nem sempre dá.

A alternativa é o mesmo `select` com `default` do exemplo, mas sem o envio bloqueante depois. Se não couber na fila agora, o `default` devolve um erro, e um servidor responderia algo como `503` ou `429`. Isto é descarte de carga (_load shedding_).

A diferença para a janela deslizante, que ainda vem na série, é quem sai perdendo. No descarte de carga é o valor novo, que nem chega a entrar. Na janela é o mais antigo, que sai da fila para dar lugar.

Esperar, rejeitar o novo ou descartar o antigo. Não tem resposta certa, depende do que o seu sistema aguenta.

## De onde veio o exemplo

O código está na pasta [`backpressure`](https://github.com/cassiobotaro/concorrencia-go/tree/main/backpressure) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste de lá roda dentro do `synctest`, com relógio falso, então os 200 milissegundos não custam nada.

No próximo vem o semáforo, que usa um canal com buffer para limitar quantas gorrotinas rodam ao mesmo tempo.

Lembrando que o buffer tira a sincronização entre quem envia e quem recebe. Por isso a série usa canais sem buffer sempre que pode, e ele só aparece quando é a própria ideia do padrão, como aqui.

Então é isso, pessoal!

Até a próxima!

{}'s
