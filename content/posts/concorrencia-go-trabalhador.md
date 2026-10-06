+++
title = "Concorrência Go - Trabalhador"
date = "2026-10-06"
publishDate = "2026-10-06"
description = "Uma gorrotina que lê um canal até ele fechar parece o padrão mais simples da série, mas o último valor some quase sempre. Veja o motivo, e como fechar um canal serve para avisar que o trabalho acabou."
slug = "concorrencia-go-trabalhador"
tags = ["go", "concorrência", "gorrotinas", "canais", "trabalhador"]
categories = ["go"]
series = ["concorrencia-go"]
+++

{{< video src="/videos/trabalhador.mp4" titulo="Uma gorrotina consumindo valores de um canal" >}}

No [gerador](/posts/concorrencia-go-geradores/) uma gorrotina escrevia no canal e a `main` lia.

Agora os papéis se invertem. Quem lê é a gorrotina.

## O que é um trabalhador

Um trabalhador é uma gorrotina que recebe valores de um canal e os processa até o canal ser fechado.

Ele também aparece como consumidor ou _sink_, mas esse segundo nome só vale quando ele é o último estágio, ou seja, quando não repassa nada adiante.

Vamos à primeira tentativa. A `main` envia os inteiros de 0 a 9 e o trabalhador imprime cada um:

```go
package main

import "fmt"

func trabalhador(entrada <-chan int) {
	for valor := range entrada {
		fmt.Printf("valor: %v\n", valor)
	}
}

func main() {
	entrada := make(chan int)
	go trabalhador(entrada)
	for i := range 10 {
		entrada <- i
	}
	// fechar a entrada encerra o range do trabalhador
	close(entrada)
}
```

Repare no `for valor := range entrada`. O `range` recebe um valor por vez e termina sozinho quando quem envia fecha o canal, então o trabalhador não precisa de contador nem de valor especial para saber que acabou.

O `fmt.Printf` está ali só para mostrar a execução. No lugar dele entra o que você precisar processar.

```bash
$ go run .
valor: 0
valor: 1
...
valor: 8
```

Opa! Cadê o 9?

Rodei 200 vezes aqui e o `valor: 9` sumiu em 189.

## Mas o close não resolve?

Porém fechar a `entrada` não espera o trabalhador terminar de processar.

Quando o último envio retorna, o trabalhador recebeu o 9, mas talvez ainda não o tenha impresso. A `main` fecha o canal, termina, e como já vimos no [olá mundo](/posts/concorrencia-go-ola-mundo/), leva junto qualquer gorrotina que ainda esteja rodando.

E o `time.Sleep` continua sendo chute, porque nenhum tempo fixo garante que o trabalho acabou.

O que falta é o trabalhador avisar que terminou:

```diff
 func main() {
 	entrada := make(chan int)
-	go trabalhador(entrada)
+	pronto := make(chan struct{})
+	go func() {
+		trabalhador(entrada)
+		// fechar o canal avisa "terminei" a qualquer número de leitores
+		close(pronto)
+	}()
 	for i := range 10 {
 		entrada <- i
 	}
 	// fechar a entrada encerra o range do trabalhador
 	close(entrada)
+	<-pronto
 }
```

Agora a `main` fica parada em `<-pronto` até o trabalhador sair do laço, e o 9 aparece em todas as execuções.

## Mas por que fechar em vez de enviar?

Repare que para avisar eu fechei o canal `pronto` em vez de enviar um valor nele. Por quê?

Fechar um canal é o jeito usual em Go de comunicar algo que acontece uma vez só, como "terminei" ou "pode parar". O Go libera de uma vez todo mundo que estiver lendo o canal, então o aviso funciona para qualquer número de leitores.

Por isso o canal é um `chan struct{}`, que não carrega dado nenhum. Ninguém vai ler um valor dali, só esperar o fechamento.

Um último detalhe que chamo atenção é quem fecha o `pronto`: a gorrotina anônima lá na `main`. O `trabalhador` só processa valores e nem sabe que esse aviso existe.

## De onde veio o exemplo

O código está na pasta [`trabalhador`](https://github.com/cassiobotaro/concorrencia-go/tree/main/trabalhador) do [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), junto com o teste que confere os dez valores.

No próximo vem o _pipeline_, que junta os dois papéis: cada estágio é trabalhador de quem vem antes e gerador para quem vem depois.

Lembrando que o `for i := range 10` só funciona a partir do Go 1.22.

Então é isso, pessoal!

Até a próxima!

{}'s
