+++
title = "Go Concurrency - Confirmed stop"
date = "2026-11-25"
publishDate = "2026-11-25"
description = "Cancelling the context says stop, but it doesn't say it stopped. See what gets lost when main doesn't wait, how errgroup brings the confirmation back, and what the context does and doesn't do."
slug = "go-concurrency-confirmed-stop"
tags = ["go", "concurrency", "goroutines", "context", "errgroup", "cancellation"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/parada_com_confirmacao.mp4" titulo="The stop request going down through the context and the confirmation coming back up" >}}

Since the [generators](/en/posts/go-concurrency-generators/) the whole series has used `ctx.Done()` to tell a goroutine to stop.

But telling it to stop doesn't mean it stopped. If the generator has an open file or a connection to close, what happens to it?

## I cancelled, now what?

I gave the generator a 100 millisecond cleanup when it sees `ctx.Done()`, and in `main` I called `cancel()` and finished, without waiting for anything. I ran it 20 times:

```bash
$ go run .
main: done
```

Twenty times the same thing. Not even the "releasing resources..." showed up.

It's the [hello world](/en/posts/go-concurrency-hello-world/) all over again. The `cancel()` woke the goroutine up, but `main` finished before it took a single step, and took the cleanup with it. Open file, dangling connection, and nobody found out.

## What a confirmed stop is

Whoever asks for the stop waits for the goroutine to confirm it stopped, and only then moves on.

It also goes by _shutdown_ with _ack_ or _graceful stop_.

In the talks this was done by hand: Rob Pike, in [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide), answers on the `quit` channel itself, and Sameer Ajmani, in [Advanced Go Concurrency Patterns](https://go.dev/talks/2013/advconc.slide), uses [request and response](/en/posts/go-concurrency-request-response/) with a `chan chan error`.

The `context` only does the bottom half. It carries the signal from the caller to the callee, and never brings anything back. For the top half, the habit today is to pair the `context` with the `errgroup` from the [semaphore](/en/posts/go-concurrency-semaphore/):

```go
func chatterboxWithContext(ctx context.Context, name string, out chan<- string) error {
	for i := 0; ; i++ {
		select {
		case out <- fmt.Sprintf("%s %d", name, i):
		case <-ctx.Done():
			cleanup()
			// the confirmation is the return itself
			return ctx.Err()
		}
	}
}

func stopWithErrgroup() {
	ctx, cancel := context.WithCancel(context.Background())
	out := make(chan string)

	var g errgroup.Group
	g.Go(func() error { return chatterboxWithContext(ctx, "Bia", out) })

	for range 3 {
		fmt.Println(<-out)
	}
	// the request goes down through the context and the answer comes up through the errgroup
	cancel()
	fmt.Println("generator:", g.Wait())
}
```

> :warning: The `errgroup` lives outside the standard library. Install it with `go get golang.org/x/sync/errgroup`.

```bash
$ go run .
Bia 0
Bia 1
Bia 2
generator: releasing resources...
generator: context canceled
```

Now the "releasing resources..." shows up on every run, and `main` only moves on after it.

Notice the order of the last two lines of `stopWithErrgroup`. The `cancel()` says stop, and `g.Wait()` blocks until the goroutine returns and hands over whatever it returned. It's Ajmani's `Close` in two calls, with no hand-written reply channel.

## But wasn't `errgroup` for errors?

It was, and it still is. Here the error is the confirmation.

The `context canceled` that showed up in the output is the `ctx.Err()` returned by the generator, that is, "I stopped, and I stopped because you told me to". If the cleanup failed to close the file, the generator would return that error instead, and `main` would find out through the same `g.Wait()`.

Hmmm 🤔 What if I want to say why it stopped?

That's what `context.WithCancelCause` is for, since Go 1.20. Whoever cancels passes an error, and the goroutine reads it with `context.Cause(ctx)`. But that's information going down, and it doesn't replace the confirmation, which goes up.

## Where the example comes from

The code is in the [`cancelamento`](https://github.com/cassiobotaro/concorrencia-go/tree/main/cancelamento) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), which shares its `main` with the next pattern in the series. The `time.Sleep` inside `cleanup` is scaffolding, it's there so the release takes a visible amount of time. Heads up: the repository is written in Portuguese, so the generator there is called `tagarelaComContext` and the cleanup is `limpeza`.

Next up is combining stop signals. A goroutine that needs to stop when any of several signals arrives, and what to do when not all of them are contexts.

Remember that `context` only made it into the standard library in Go 1.7, in 2016, after both talks. What it standardized was just the closed `quit` channel to warn everyone. The rest, like this confirmation, is still written by hand.

That's it, folks!

See you next time!

{}'s
