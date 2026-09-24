+++
title = "Go Concurrency - Hello world"
date = "2026-09-24"
publishDate = "2026-09-24"
description = "The first program with goroutines usually prints nothing. See why that happens and how a channel fixes it, kicking off the series on Go concurrency patterns."
slug = "go-concurrency-hello-world"
tags = ["go", "concurrency", "goroutines", "channels"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/ola_mundo.mp4" titulo="A goroutine sending a message through a channel" >}}

A few years ago I watched a [talk](https://github.com/andrebq/andrebq.github.io) by [@andrebq](https://github.com/andrebq) about concurrency in Go and my mind was blown.

Much later I decided to transcribe the examples from that talk into a repository, and kept adding others I found in books, in articles and in Rob Pike's talk [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide). It became [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go).

Now I'm bringing that material over here, one pattern at a time.

## Share memory by communicating

Go is grounded in CSP (_Communicating Sequential Processes_), a model proposed by Tony Hoare. In it, instead of several threads of execution poking at the same variable, each one does its own work and exchanges messages.

In Go those messages go through channels, and that's where the proverb comes from: "_Don't communicate by sharing memory, share memory by communicating_".

Every pattern in the series is a combination of that idea.

## Where we start from

The series assumes you already know how Go works: what a goroutine is, what a channel is, how `select` picks a case, what a `WaitGroup` is for.

If any of those is still fuzzy, go through the [Tour of Go](https://go.dev/tour/concurrency/1) first. Here we go straight to the patterns.

But any self-respecting series starts with a hello world.

## The first attempt

To run a function concurrently you just write `go` in front of the call. Sounds too easy, so let's try it:

```go
package main

import "fmt"

func main() {
	// go fires the function off in a goroutine
	go fmt.Println("Hello, world!")
}
```

```bash
$ go run .
$
```

Oops! Where's the message?

I ran it twenty times here and it didn't show up once.

`go` fires off the goroutine and moves on, without waiting for it. But the next thing `main` does is return, and **when `main` returns, the program ends**, taking along any goroutine still hanging around.

Ours didn't even have time to write to the screen.

It's tempting to put a `time.Sleep` at the end of `main`. It works, but it's a guess. How long should it wait? And what if tomorrow the function takes longer?

## Enter the channel

What `main` needs is a way to wait for the message, not for some arbitrary amount of time.

```go
package main

import "fmt"

func main() {
	// an unbuffered channel of strings
	channel := make(chan string)

	go func() {
		// sends and blocks until someone receives
		channel <- "Hello, world!"
	}()

	// main blocks here until the message arrives
	fmt.Println(<-channel)
}
```

```bash
$ go run .
Hello, world!
```

Now we're talking! 🎉

The channel is the bridge between `main` and the goroutine. Since it has no buffer, send and receive happen together: whoever gets there first waits for the other.

That's why `main` can't finish too early.

Notice also that the two don't share any variable. The string leaves one side and arrives on the other, and the channel takes care of the synchronization.

Hmmm 🤔 what if nobody read from the channel?

The goroutine would stay blocked on the send forever, or rather, until `main` returned. In a program this size nobody notices, but in a server that stays up for months this has a name: goroutine leak. Keep that in the back of your mind, it comes back later in the series.

## Where the example comes from

The code is in the [`ola_mundo`](https://github.com/cassiobotaro/concorrencia-go/tree/main/ola_mundo) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). There's also an `exemplo_test.go` there that checks the output. Heads up: the repository is written in Portuguese, so the code there says "Olá, mundo!" instead of "Hello, world!".

Next up is the first real pattern, the generator, which is a function that returns a channel and produces values on its own.

And after that there's a lot more: pipeline, fan-out and fan-in, semaphore, sliding window, a goroutine that decides another one has died when it stops sending signs of life, and even a chain of 10 thousand goroutines, just to see how much a goroutine costs.

That's it, folks!

See you next time!

{}'s
