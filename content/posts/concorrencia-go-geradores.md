+++
title = "Concorrência Go - Geradores"
date = "2026-10-01"
publishDate = "2026-10-01"
description = "Uma função que devolve um canal entrega os valores conforme eles aparecem, em vez de esperar o último. Veja como o range e o close conversam, e como um contexto impede que a gorrotina fique presa quando alguém para de ler no meio."
slug = "concorrencia-go-geradores"
tags = ["go", "concorrência", "gorrotinas", "canais", "geradores", "context"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/geradores.mp4" titulo="Uma gorrotina produzindo valores em um canal" >}}

No [olá mundo](/posts/concorrencia-go-ola-mundo/) o canal levou uma mensagem só, da gorrotina para a `main`.

Mas quase nunca é uma mensagem só. São as linhas de um arquivo, as páginas de uma API, os eventos de uma fila. E é aqui que entra o primeiro padrão da série.

## O que é um gerador

Um gerador é uma função que dispara uma gorrotina para escrever uma sequência de valores em um canal, e devolve esse canal a quem a chamou.

Ele também aparece por aí como produtor ou _source_, dependendo de quem está contando.

Vamos começar pela versão mais direta. A gorrotina gera uma sequência de números inteiros e manda cada um para o canal:

```go
package main

import "fmt"

func sequenciaNumeros(inicial, final int) <-chan int {
	saida := make(chan int)
	go func() {
		for i := inicial; i <= final; i++ {
			saida <- i
		}
		// após gerar todos os valores, fecha o canal
		close(saida)
	}()
	return saida
}

func main() {
	valores := sequenciaNumeros(1, 1000)
	for valor := range valores {
		fmt.Printf("valor: %v\n", valor)
	}
}
```

```bash
$ go run .
valor: 1
valor: 2
valor: 3
...
valor: 1000
```

Nada de surpreendente na saída, mas repare no que não aconteceu: a `sequenciaNumeros` devolveu o canal na hora, sem esperar número nenhum ficar pronto.

Se ela devolvesse uma fatia (_slice_) com os mil números, a `main` não imprimiria o primeiro antes do milésimo estar lá dentro. Com o canal, a gorrotina escreve o 2 enquanto a `main` imprime o 1, e existe um valor em trânsito por vez em vez de mil na memória.

> :bulb: Antes do Go 1.23 não existia `iter.Seq`, e como gorrotina é barata, era assim que se escrevia um iterador em Go. Hoje, para só percorrer valores, o `iter.Seq` resolve sem gorrotina nenhuma.

## O range e o close

A `main` lê o canal e imprime os valores. Com o `range`, a iteração continua até o canal ser fechado.

É por isso que o `close(saida)` no fim da gorrotina não é enfeite. Sem ele, a `main` termina de receber o milésimo valor e fica esperando o próximo, que não vem:

```bash
fatal error: all goroutines are asleep - deadlock!
```

E Pam! A gorrotina já terminou, não sobra ninguém para escrever no canal, e o Go derruba o programa.

Repare também no retorno `<-chan int`, um canal só de leitura: quem chamou não consegue escrever nem fechar o canal por engano.

## E se eu parar de ler no meio?

Lembra da pulga atrás da orelha do post anterior? Voltou.

```go
for valor := range sequenciaNumeros(1, 1000) {
	if valor == 3 {
		break
	}
	fmt.Printf("valor: %v\n", valor)
}
```

O `break` sai do laço, a `main` segue a vida e a gorrotina fica parada em `saida <- 4`, esperando alguém que nunca mais vai ler.

Em um programa que roda e termina ninguém percebe. Mas em um servidor que fica meses no ar, cada leitura interrompida no meio deixa uma gorrotina para trás, com o canal e tudo o que ela segura.

E como a gorrotina fica sabendo que ninguém mais vai ler?

## Quem consome avisa que parou

Sozinha, não fica. Quem consome precisa avisar, e em Go esse aviso vem através de um `context.Context`:

```diff
-func sequenciaNumeros(inicial, final int) <-chan int {
+func sequenciaNumeros(ctx context.Context, inicial, final int) <-chan int {
 	saida := make(chan int)
 	go func() {
+		// fecha o canal ao sair, tanto no fim quanto no cancelamento
+		defer close(saida)
 		for i := inicial; i <= final; i++ {
-			saida <- i
+			select {
+			case saida <- i:
+			case <-ctx.Done():
+				return
+			}
 		}
-		// após gerar todos os valores, fecha o canal
-		close(saida)
 	}()
 	return saida
 }
```

Repare no `select`. Cada envio disputa com `ctx.Done()`, e se quem consome cancelar o contexto, a gorrotina sai do laço em vez de ficar presa no envio. Como agora ela tem duas saídas, o `close` virou `defer`.

Parando no meio fica assim:

```go
ctx, cancelar := context.WithCancel(context.Background())
valores := sequenciaNumeros(ctx, 1, 1000)
fmt.Printf("valor: %v\n", <-valores)
cancelar()
// drena até o canal fechar
for range valores {
}
fmt.Println("gerador encerrado")
// valor: 1
// gerador encerrado
```

O canal só fecha quando a gorrotina sai. Logo, se `gerador encerrado` aparece na tela, ninguém ficou para trás.

Porém a responsabilidade passou para quem consome, que precisa cancelar ao sair mesmo quando leu tudo. Esquecer é tão comum que o `go vet` tem uma verificação só para isso, a `lostcancel`.

## De onde veio o exemplo

O código completo está na pasta [`geradores`](https://github.com/cassiobotaro/concorrencia-go/tree/main/geradores) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), com um teste que faz esse caminho de cancelar e drenar.

No próximo vem o outro lado do balcão, o trabalhador, que é quem consome desse canal.

Então é isso, pessoal!

Até a próxima!

{}'s
