+++
title = "Go Concurrency - Daisy-chain"
date = "2026-12-07"
publishDate = "2026-12-07"
description = "Ten thousand goroutines in a row, each one adding 1 and passing it along. Nobody uses this day to day. It's there to measure how much a goroutine costs, and the answer fits in one terminal line."
slug = "go-concurrency-daisy-chain"
tags = ["go", "concurrency", "goroutines", "channels", "memory"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/corrente.mp4" titulo="A value crossing a chain of goroutines, adding 1 at each link" >}}

Last one in the series, and nobody uses this one day to day.

It's at the end of Rob Pike's talk [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide), and it exists to answer a single question: how much does a goroutine cost?

## What a daisy-chain is

It's a chain of goroutines. Each one gets a value from its neighbor on the right, adds 1 and passes it to its neighbor on the left.

It also goes by goroutine chain or telephone game, and in Portuguese I call it a chain (corrente).

```go
// receives from the right, adds 1 and passes it to the left
func link(left chan<- int, right <-chan int) {
	left <- 1 + <-right
}

func main() {
	const n = 10000

	leftmost := make(chan int)
	left := leftmost
	var right chan int
	for range n {
		right = make(chan int)
		go link(left, right)
		left = right
	}

	// drops the 1 at the right end...
	go func() { right <- 1 }()
	// ...and waits for it to cross the 10 thousand goroutines
	fmt.Println(<-leftmost)
}
```

```bash
$ go run .
10001
```

Notice the `left = right` at the end of the loop. The channel that was the right of one link becomes the left of the next, and that's what joins the 10 thousand together. Each goroutine is born and sits still on `<-right`, waiting for its neighbor.

When the 1 comes in at the right end, the last goroutine wakes up, adds, sends, and the one before it wakes up. Ten thousand times. Out comes 10001 at the other end.

## But how much does it cost?

I measured it here, on an i7-1185G7 with Go 1.27.2, the time and the memory the program asks from the system:

```bash
$ go run . 10000
10000 links: total 40ms, memory 31 MB, 3.1 KB per goroutine
$ go run . 100000
100000 links: total 443ms, memory 290 MB, 2.8 KB per goroutine
$ go run . 1000000
1000000 links: total 4.327s, memory 2867 MB, 2.8 KB per goroutine
```

A million goroutines in 4 seconds, and less than 3 KB for each one, already counting the channel it carries.

For comparison, an operating system _thread_ reserves as much stack as `ulimit -s` says, and on this machine that's 8 MB. Ten thousand _threads_ would be 80 GB of reserved address space just to add 1. A goroutine starts with about 2 KB of stack, and it only grows when the function needs it.

So splitting the work into really small pieces, with one goroutine for each, isn't a luxury. That's how it went in the [fan-out](/en/posts/go-concurrency-fan-out/), in the [semaphore](/en/posts/go-concurrency-semaphore/) with one goroutine per task, in [first to respond](/en/posts/go-concurrency-first-to-respond/) with one per replica. The cost that matters isn't creating the goroutine, it's leaving one stuck forever, which has been the nagging doubt since the [hello world](/en/posts/go-concurrency-hello-world/).

## Where the example comes from

The code is in the [`corrente`](https://github.com/cassiobotaro/concorrencia-go/tree/main/corrente) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), and the test checks the 10001. Heads up: the repository is written in Portuguese, so the link there is called `elo`.

And the series ends here. That was 21 patterns, from the hello world to this chain, all in the same repository. If some example didn't run, if some explanation was confusing or if you know a pattern that was left out, open an _issue_ there and I'll improve it.

Remember that the daisy-chain is a toy. What's worth keeping from it is the number: less than 3 KB per goroutine, and a million of them in 4 seconds.

That's it, folks!

See you next time!

{}'s
