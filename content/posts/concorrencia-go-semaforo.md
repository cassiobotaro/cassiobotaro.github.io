+++
title = "Concorrência Go - Semáforo"
date = "2026-10-29"
publishDate = "2026-10-29"
description = "Uma gorrotina por tarefa, mas só três rodando ao mesmo tempo. Veja como um canal com buffer vira um semáforo, em que ele difere do grupo de trabalhadores, e como o errgroup trata o erro que a série vinha ignorando."
slug = "concorrencia-go-semaforo"
tags = ["go", "concorrência", "gorrotinas", "canais", "semáforo", "errgroup", "buffer"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/semaforo.mp4" titulo="Dez tarefas disputando três vagas" >}}

No [grupo de trabalhadores](/posts/concorrencia-go-grupo-de-trabalhadores/) eu fixei quantas gorrotinas existem. Na [contrapressão](/posts/concorrencia-go-contrapressao/) a capacidade de um canal freava o produtor.

Mas e se eu tiver dez arquivos para baixar, e o servidor derrubar quem abre mais de três conexões? Eu quero uma gorrotina por arquivo, e só três delas baixando ao mesmo tempo.

## O que é um semáforo

Um canal com buffer de capacidade `n` funciona como um semáforo. Enviar ocupa uma vaga, e bloqueia quando todas estão ocupadas. Receber libera uma vaga.

Ele também aparece como _bounded parallelism_, que é o nome que o artigo [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines), do Sameer Ajmani, usa.

Vamos disparar dez tarefas de uma vez, com três vagas:

```go
func executarTarefas(tarefas, limite int) {
	// cada valor no buffer é uma vaga ocupada
	sem := make(chan struct{}, limite)

	var wg sync.WaitGroup
	// só para a gente enxergar quantas estão rodando
	var ativas atomic.Int32

	for i := range tarefas {
		wg.Go(func() {
			sem <- struct{}{}        // ocupa uma vaga, ou espera por uma
			defer func() { <-sem }() // devolve a vaga ao terminar

			fmt.Printf("tarefa %2d começou, ativas: %d\n", i+1, ativas.Add(1))
			time.Sleep(100 * time.Millisecond)
			ativas.Add(-1)
		})
	}

	wg.Wait()
}

func main() {
	executarTarefas(10, 3)
}
```

```bash
$ go run .
tarefa  2 começou, ativas: 1
tarefa 10 começou, ativas: 2
tarefa  6 começou, ativas: 3
tarefa  4 começou, ativas: 3
...
tarefa  9 começou, ativas: 3
```

Preste atenção na coluna `ativas`. Ela sobe até 3 e não passa disso, por mais que as dez gorrotinas já existam desde a primeira volta do laço.

Repare nas duas primeiras linhas da gorrotina. O `sem <- struct{}{}` só retorna quando cabe mais um valor no buffer, ou seja, quando alguém devolveu uma vaga. E o `defer` garante a devolução mesmo que a tarefa dê _panic_ no meio.

Medi aqui com dez tarefas de 100 milissegundos. Limite 1, um segundo. Limite 3, 400 milissegundos. Limite 10, 100 milissegundos.

É um dos poucos casos em que o buffer do canal não é ajuste fino. A capacidade é o próprio limite.

## Mas isto não é o grupo de trabalhadores?

Parece, e os dois resolvem o mesmo problema. A diferença é quem existe.

No grupo existem três gorrotinas, e elas puxam valores de um canal. Aqui existem dez, uma por tarefa, e só três avançam por vez. As outras sete nasceram e ficaram paradas no `sem <- struct{}{}`.

Isto faz diferença quando as tarefas já estão na sua mão, em um _slice_, e não chegando por um canal. Cada uma vira um `wg.Go` com os próprios argumentos, sem precisar de um canal de entrada para enfileirar.

## E quando uma tarefa dá erro?

No [pipeline](/posts/concorrencia-go-pipeline/) deixei essa pergunta para depois. Chegou a hora.

O canal de vagas limita e o `WaitGroup` espera. O que falta é o erro, e o pacote `golang.org/x/sync/errgroup` junta os três em um tipo só:

```go
func executarTarefasErrgroup(tarefas, limite, falha int) error {
	// o contexto é cancelado no primeiro erro
	g, ctx := errgroup.WithContext(context.Background())
	// as três vagas
	g.SetLimit(limite)

	for i := range tarefas {
		// bloqueia quando as vagas acabam
		g.Go(func() error {
			// quem ainda não começou desiste
			if ctx.Err() != nil {
				fmt.Printf("tarefa %2d cancelada\n", i+1)
				return ctx.Err()
			}
			fmt.Printf("tarefa %2d começou\n", i+1)
			if i+1 == falha {
				return fmt.Errorf("tarefa %d falhou", i+1)
			}
			time.Sleep(100 * time.Millisecond)
			return nil
		})
	}

	// espera todas e devolve o primeiro erro
	return g.Wait()
}
```

> :warning: O `errgroup` fica fora da biblioteca padrão. Instale com `go get golang.org/x/sync/errgroup`.

Com dez tarefas, três vagas e a tarefa 2 falhando:

```bash
$ go run .
tarefa  3 começou
tarefa  2 começou
tarefa  1 começou
tarefa  4 cancelada
...
tarefa 10 cancelada
errgroup: tarefa 2 falhou
```

A 1 e a 3 começaram junto com a 2 e terminam normalmente. As outras sete, quando conseguem uma vaga, encontram o contexto cancelado e nem começam. Rodei 200 vezes aqui e foram sete canceladas em todas.

## De onde veio o exemplo

O código está na pasta [`semaforo`](https://github.com/cassiobotaro/concorrencia-go/tree/main/semaforo) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), com as duas versões. O teste usa uma vaga só, porque com uma vaga a ordem é fixa.

No próximo vem o sistema de ticket. O semáforo limita quantas tarefas rodam ao mesmo tempo, e o ticket limita quantas começam por segundo.

O `sem <- struct{}{}` espera pela vaga sem olhar o contexto. Se quem chamou cancelar, a gorrotina continua parada ali. Para a espera respeitar o cancelamento, o envio vai dentro de um `select` com `ctx.Done()`, ou você usa o `golang.org/x/sync/semaphore`, cujo `Acquire` já recebe o `ctx`.

Então é isso, pessoal!

Até a próxima!

{}'s
