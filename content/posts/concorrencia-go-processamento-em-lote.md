+++
title = "Concorrência Go - Processamento em lote"
date = "2026-11-04"
publishDate = "2026-11-04"
description = "Itens chegam um a um e o banco prefere receber cem de uma vez. Veja como juntar em lotes por tamanho, por tempo ou sob demanda, e por que reaproveitar o slice do lote anterior corrompe o que o consumidor ainda está lendo."
slug = "concorrencia-go-processamento-em-lote"
tags = ["go", "concorrência", "gorrotinas", "canais", "batch", "timer", "slice"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/lote.mp4" titulo="Itens chegando um a um e saindo agrupados em lotes" >}}

Uma fila de eventos em que cada evento vira um `INSERT`. Mil eventos por segundo, mil idas e voltas ao banco por segundo.

O banco aceita cem linhas em uma requisição só. Mas os eventos não chegam de cem em cem, chegam um a um.

## O que é um processamento em lote

Um processamento em lote agrupa itens que chegam um por um, para que o consumidor os processe em blocos.

Ele também aparece como _batching_ ou _micro-batching_.

Um lote sai de três jeitos. Quando enche, quando passa um prazo sem encher, para um item não ficar esperando companhia para sempre, e sob demanda, por um canal de descarga.

```go
func processamentoLotes(entrada <-chan req, descarga <-chan struct{}, tamanhoLote int, intervalo time.Duration) <-chan []req {
	saida := make(chan []req)
	go func() {
		defer close(saida)
		buf := make([]req, 0, tamanhoLote)

		// nasce parado, porque ainda não existe lote
		prazo := time.NewTimer(intervalo)
		prazo.Stop()

		descarregar := func() {
			if len(buf) == 0 {
				return
			}
			prazo.Stop()
			saida <- buf
			buf = make([]req, 0, tamanhoLote)
		}

		for {
			select {
			case item, ok := <-entrada:
				if !ok {
					// entrada fechada: o lote parcial ainda sai
					descarregar()
					return
				}
				// primeiro item do lote: começa a contar o prazo
				if len(buf) == 0 {
					prazo.Reset(intervalo)
				}
				buf = append(buf, item)
				if len(buf) == tamanhoLote {
					descarregar()
				}
			case <-prazo.C:
				descarregar()
			case <-descarga:
				descarregar()
			}
		}
	}()
	return saida
}
```

A `main` pede lotes de três itens ou 100 milissegundos, o que vier primeiro, e testa os três jeitos:

```go
saida := processamentoLotes(entrada, descarga, 3, 100*time.Millisecond)
pronto := processadorLotes(saida)

// três itens enchem o lote
entrada <- req{valor: 1}
entrada <- req{valor: 2}
entrada <- req{valor: 3}

// dois itens e uma descarga manual
entrada <- req{valor: 4}
entrada <- req{valor: 5}
descarga <- struct{}{}

// um item sozinho, e o prazo passa
entrada <- req{valor: 6}
time.Sleep(150 * time.Millisecond)

// dois itens, e fechar a entrada descarrega o resto
entrada <- req{valor: 7}
entrada <- req{valor: 8}
close(entrada)
<-pronto
```

O `processadorLotes` é o trabalhador de sempre, lendo um `[]req` por vez e fechando `pronto` no fim.

```bash
$ go run .
processando lote com valores: [{1} {2} {3}]
processando lote com valores: [{4} {5}]
processando lote com valores: [{6}]
processando lote com valores: [{7} {8}]
```

Preste atenção no item 6. Ele saiu sozinho, sem encher o lote e sem ninguém pedir, porque os 100 milissegundos passaram.

Repare também no `prazo.Reset` dentro do `if len(buf) == 0`. O prazo conta a partir do primeiro item de cada lote, e não do relógio da parede. Um `time.Ticker` marcaria o tempo por conta própria, e um lote começado logo antes do tique sairia com um item. É o mesmo motivo do [sistema de ticket](/posts/concorrencia-go-sistema-de-ticket/).

## Mas por que não reaproveitar o slice?

Olhe o `buf = make([]req, 0, tamanhoLote)` depois do envio. Um `make` a cada lote. Dá vontade de trocar por `buf = buf[:0]`, que zera o tamanho e mantém a memória.

Eu troquei. E para ficar parecido com um banco de verdade, deixei o consumidor demorar 50 milissegundos entre receber o lote e ler o conteúdo:

```bash
$ go run . reaproveitar
processando lote com valores: [{4} {5} {6}]
processando lote com valores: [{4} {5} {6}]
```

Opa! O lote `[{4} {5} {6}]` apareceu duas vezes, e os itens 1, 2 e 3 sumiram.

Um _slice_ é só uma janela para um _array_ por baixo. O `saida <- buf` entregou a janela, mas o `buf[:0]` continuou apontando para o mesmo _array_, e os `append` seguintes escreveram por cima do que o consumidor ainda não tinha lido.

Com o `make`, cada lote tem o seu _array_, e o consumidor pode demorar o quanto quiser. É o preço de passar um _slice_ por um canal.

## De onde veio o exemplo

O código está na pasta [`lote`](https://github.com/cassiobotaro/concorrencia-go/tree/main/lote) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). O teste roda a `main` inteira dentro do `synctest`, então o `time.Sleep` de 150 milissegundos não custa nada.

No próximo vem a janela deslizante, a que ficou devendo lá na [contrapressão](/posts/concorrencia-go-contrapressao/). Quando o consumidor não acompanha, em vez de frear o produtor, ela descarta o valor mais antigo.

Lembre-se que o `prazo.Stop()` sem drenar o `prazo.C` só é correto desde o Go 1.23. Antes disso, se o lote enchesse no mesmo instante do disparo, o tique ficava guardado e o lote seguinte sairia cedo.

Então é isso, pessoal!

Até a próxima!

{}'s
