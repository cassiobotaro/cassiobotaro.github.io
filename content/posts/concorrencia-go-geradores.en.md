+++
title = "Go Concurrency - Generators"
date = "2026-10-01"
publishDate = "2026-10-01"
description = "A function that returns a channel hands over values as they show up, instead of waiting for the last one. See how range and close talk to each other, and how a context keeps the goroutine from getting stuck when someone stops reading halfway through."
slug = "go-concurrency-generators"
tags = ["go", "concurrency", "goroutines", "channels", "generators", "context"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/geradores.mp4" titulo="A goroutine producing values on a channel" >}}

In the [hello world](/en/posts/go-concurrency-hello-world/) the channel carried a single message, from the goroutine to `main`.

But it's almost never a single message. It's the lines of a file, the pages of an API, the events of a queue. And this is where the first pattern of the series comes in.

## What a generator is

A generator is a function that fires off a goroutine to write a sequence of values to a channel, and returns that channel to whoever called it.

It also goes by producer or source, depending on who's telling the story.

Let's start with the most direct version. The goroutine generates a sequence of integers and sends each one to the channel:

```go
package main

import "fmt"

func numberSequence(start, end int) <-chan int {
	out := make(chan int)
	go func() {
		for i := start; i <= end; i++ {
			out <- i
		}
		// after generating all the values, closes the channel
		close(out)
	}()
	return out
}

func main() {
	values := numberSequence(1, 1000)
	for value := range values {
		fmt.Printf("value: %v\n", value)
	}
}
```

```bash
$ go run .
value: 1
value: 2
value: 3
...
value: 1000
```

Nothing surprising in the output, but notice what didn't happen: `numberSequence` returned the channel right away, without waiting for any number to be ready.

If it returned a slice with the thousand numbers, `main` wouldn't print the first one before the thousandth was in there. With the channel, the goroutine writes the 2 while `main` prints the 1, and there's one value in transit at a time instead of a thousand in memory.

> :bulb: Before Go 1.23 there was no `iter.Seq`, and since goroutines are cheap, this was how you wrote an iterator in Go. Today, to just walk through values, `iter.Seq` does the job with no goroutine at all.

## range and close

`main` reads the channel and prints the values. With `range`, the iteration goes on until the channel is closed.

That's why the `close(out)` at the end of the goroutine isn't decoration. Without it, `main` finishes receiving the thousandth value and sits waiting for the next one, which never comes:

```bash
fatal error: all goroutines are asleep - deadlock!
```

And bam! The goroutine has already finished, there's nobody left to write to the channel, and Go brings the program down.

Notice also the `<-chan int` return type, a receive-only channel: whoever called can't write to the channel or close it by mistake.

## What if I stop reading halfway through?

Remember what I asked you to keep in the back of your mind in the previous post? It's back.

```go
for value := range numberSequence(1, 1000) {
	if value == 3 {
		break
	}
	fmt.Printf("value: %v\n", value)
}
```

The `break` leaves the loop, `main` moves on and the goroutine stays parked at `out <- 4`, waiting for someone who will never read again.

In a program that runs and exits nobody notices. But in a server that stays up for months, every read interrupted halfway leaves a goroutine behind, along with the channel and everything it holds.

And how does the goroutine find out that nobody is going to read anymore?

## The consumer says when it's done

On its own, it doesn't. Whoever consumes has to say so, and in Go that message comes through a `context.Context`:

```diff
-func numberSequence(start, end int) <-chan int {
+func numberSequence(ctx context.Context, start, end int) <-chan int {
 	out := make(chan int)
 	go func() {
+		// closes the channel on the way out, both at the end and on cancellation
+		defer close(out)
 		for i := start; i <= end; i++ {
-			out <- i
+			select {
+			case out <- i:
+			case <-ctx.Done():
+				return
+			}
 		}
-		// after generating all the values, closes the channel
-		close(out)
 	}()
 	return out
 }
```

Notice the `select`. Each send races against `ctx.Done()`, and if the consumer cancels the context, the goroutine leaves the loop instead of getting stuck on the send. Since it now has two ways out, the `close` became a `defer`.

Stopping halfway looks like this:

```go
ctx, cancel := context.WithCancel(context.Background())
values := numberSequence(ctx, 1, 1000)
fmt.Printf("value: %v\n", <-values)
cancel()
// drains until the channel closes
for range values {
}
fmt.Println("generator done")
// value: 1
// generator done
```

The channel only closes when the goroutine exits. So, if `generator done` shows up on the screen, nobody was left behind.

But the responsibility has moved to the consumer, who needs to cancel on the way out even after reading everything. Forgetting is so common that `go vet` has a check just for it, `lostcancel`.

## Where the example comes from

The full code is in the [`geradores`](https://github.com/cassiobotaro/concorrencia-go/tree/main/geradores) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), with a test that walks this path of cancelling and draining. Heads up: the repository is written in Portuguese, so the function there is called `sequenciaNumeros`.

Next up is the other side of the counter, the worker, which is the one consuming from that channel.

That's it, folks!

See you next time!

{}'s
