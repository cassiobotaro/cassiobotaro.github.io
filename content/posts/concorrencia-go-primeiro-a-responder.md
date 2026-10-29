+++
title = "Concorrência Go - Primeiro a responder"
date = "2026-11-23"
publishDate = "2026-11-23"
description = "A mesma consulta para três réplicas, e vale a primeira resposta. Veja quanto isso corta da latência de cauda, por que as perdedoras precisam ser canceladas, e o que acontece quando todas falham."
slug = "concorrencia-go-primeiro-a-responder"
tags = ["go", "concorrência", "gorrotinas", "canais", "context", "hedged-request", "latência"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/primeiro.mp4" titulo="Uma consulta enviada a três réplicas e a primeira resposta vencendo" >}}

Três réplicas do mesmo serviço, e a latência de cada uma varia a cada chamada. Se eu consulto uma só, de vez em quando caio na hora ruim dela.

E se eu mandar a mesma consulta para as três e ficar com a primeira resposta?

## O que é primeiro a responder

É isto mesmo. A consulta vai para todas as réplicas, a primeira resposta vence e as outras são canceladas.

É a técnica que o Rob Pike usa no exemplo da busca do Google, na palestra [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide), com uma função chamada `First`. Ela também aparece como _hedged request_.

```go
type resultado struct {
	resposta string
	err      error
}

func primeiro(ctx context.Context, consulta string, replicas ...func(context.Context, string) (string, error)) (string, error) {
	ctx, cancelar := context.WithCancel(ctx)
	defer cancelar()

	// uma vaga por réplica
	resultados := make(chan resultado, len(replicas))
	for _, r := range replicas {
		go func() {
			resposta, err := r(ctx, consulta)
			resultados <- resultado{resposta, err}
		}()
	}

	// uma falha também é resposta, e precisa ser contada
	var err error
	for range replicas {
		select {
		case r := <-resultados:
			if r.err == nil {
				return r.resposta, nil
			}
			err = r.err
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	return "", err
}
```

Cada réplica é simulada com uma espera aleatória de até 100 milissegundos, e desiste se o contexto for cancelado antes:

```go
func replica(nome string) func(context.Context, string) (string, error) {
	return func(ctx context.Context, consulta string) (string, error) {
		select {
		case <-time.After(rand.N(100 * time.Millisecond)):
			return fmt.Sprintf("%s respondeu a %q", nome, consulta), nil
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
}
```

```bash
$ go run .
réplica 3 respondeu a "golang"
$ go run .
réplica 1 respondeu a "golang"
```

A vencedora muda a cada execução.

Repare no `context.WithCancel` e no `defer cancelar()`. O `First` de 2012 só lê a primeira resposta, e as perdedoras continuam trabalhando até o fim para jogar o resultado fora. Aqui, assim que a `primeiro` retorna, o `cancelar()` dispara e as perdedoras saem pelo `ctx.Done()`. Uma réplica de verdade faria o mesmo com `http.NewRequestWithContext`.

## Mas quanto se ganha?

Medi aqui, 200 chamadas com uma réplica e 200 com três:

```bash
1 réplica(s): média 54ms, p50 53ms, p90 94ms, máximo 100ms
3 réplica(s): média 24ms, p50 20ms, p90 48ms, máximo 76ms
```

A média caiu pela metade, e o p90 também. É isso que se chama de reduzir a latência de cauda. Para a hora ruim atrapalhar, as três precisam estar na hora ruim ao mesmo tempo.

O preço está do outro lado. São três requisições no servidor para cada consulta, e o cancelamento só ameniza, porque as perdedoras já começaram.

## Mas por que a vaga por réplica?

Olhe o `make(chan resultado, len(replicas))`. Mesmo com o cancelamento, uma perdedora pode terminar no intervalo entre a chegada da vencedora e o `cancelar()`. Ela tenta enviar o resultado e ninguém mais vai ler.

Tirei o _buffer_ e chamei a `primeiro` 100 vezes:

```bash
vagas 0: gorrotinas vivas depois de 100 chamadas: 201
vagas 3: gorrotinas vivas depois de 100 chamadas: 1
```

Opa! Sem a vaga, as duas perdedoras de cada chamada ficaram presas no envio. Duzentas gorrotinas para trás, e em um servidor que fica meses no ar isto só cresce.

## E se todas falharem?

Preste atenção no `for range replicas`. O laço espera uma resposta por réplica, e um erro conta como resposta.

Se eu ignorasse os erros e esperasse só pelo sucesso, bastaria todas as réplicas falharem para a `primeiro` esperar para sempre, porque o `ctx.Done()` de um `context.Background()` nunca chega. Com o laço, a primeira resposta sem erro vence, e se todas falharem o último erro é devolvido.

E dá para combinar com um prazo. A `main` pede com `context.WithTimeout` de 20 milissegundos, e a `primeiro` repassa o mesmo contexto às réplicas:

```bash
$ go run .
réplica 3 respondeu a "golang"
tempo esgotado: nenhuma réplica respondeu em 20ms
```

O mesmo `ctx.Done()` que encerra a espera encerra as réplicas. É o que o Pike chama, no fim da palestra, de "_fast, replicated, robust_".

## De onde veio o exemplo

O código está na pasta [`primeiro`](https://github.com/cassiobotaro/concorrencia-go/tree/main/primeiro) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste roda no `synctest` com latências fixas, para saber de antemão quem vence, e cobre o caminho em que todas falham.

Lembrando que o padrão só faz sentido quando a consulta pode ser repetida sem efeito colateral. Mandar um `POST` que cria um pedido para três réplicas cria três pedidos.

No próximo vem a parada com confirmação. Mandar parar é fácil, o difícil é saber que a gorrotina parou de verdade e liberou o que estava usando.

Então é isso, pessoal!

Até a próxima!

{}'s
