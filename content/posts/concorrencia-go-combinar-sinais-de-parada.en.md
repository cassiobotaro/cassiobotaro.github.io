+++
title = "Go Concurrency - Combining stop signals"
date = "2026-11-30"
publishDate = "2026-11-30"
description = "A goroutine that needs to stop when any of several signals arrives. See why deriving contexts solves most of it, how to merge the rest into a single channel, and the two precautions without which it panics or leaks."
slug = "go-concurrency-combining-stop-signals"
tags = ["go", "concurrency", "goroutines", "channels", "context", "select", "or-channel"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/combinar_sinais_de_parada.mp4" titulo="Several stop signals turning into a single channel" >}}

In the [confirmed stop](/en/posts/go-concurrency-confirmed-stop/) the stop signal came from a single place.

But an HTTP _handler_ needs to stop when the request is cancelled, when the process gets a `SIGINT` or when a global deadline runs out. Three reasons, and whichever arrives first wins.

## When everything is a context

In 2017, when the book _Concurrency in Go_ came out, each of those reasons was a different channel. Today all three are contexts.

The request one always was, it's `r.Context()`. The deadline is `context.WithTimeout`. And since Go 1.16 `signal.NotifyContext` returns a context that gets cancelled when the system signal arrives.

When the sources are contexts, the answer is to derive one from the other:

```go
ctx, stopOnSignal := signal.NotifyContext(context.Background(), os.Interrupt)
defer stopOnSignal()
ctx, cancelRequest := context.WithCancel(ctx)
defer cancelRequest()
ctx, cancelDeadline := context.WithTimeout(ctx, 250*time.Millisecond)
defer cancelDeadline()

workUntil(ctx.Done())
fmt.Println("context cancelled:", ctx.Err())
```

```bash
$ go run .
working...
working...
context cancelled: context deadline exceeded
```

The child is cancelled when the parent is, so `workUntil` gets a single channel and has a single stop `case`, no matter how many sources there are.

Notice the chain has three `cancel`s. Calling a `cancel()` more than once is safe, only the first call has any effect. And when both parent and child have a deadline, the shorter one wins, because the child can only shorten it, never extend it.

## But what about what isn't a context?

What's left is whatever comes from outside the `context` package. The `ready` channel of another goroutine, the output of a generator, any `chan struct{}` closed as a signal.

For those, the `anyOf` function combines the channels into one, closed when the first of them closes:

```go
func anyOf(channels ...<-chan struct{}) <-chan struct{} {
	out := make(chan struct{})
	var once sync.Once
	for _, c := range channels {
		go func() {
			select {
			case <-c:
				once.Do(func() { close(out) })
			case <-out:
				// another signal arrived first: this goroutine finishes
			}
		}()
	}
	return out
}
```

One goroutine per input channel, and the first one to wake up closes the output. In the second half of the example the goroutine stops when the context ends or when a teammate finishes, whichever comes first:

```go
teammateDone := make(chan struct{})
go func() {
	time.Sleep(150 * time.Millisecond)
	close(teammateDone)
}()

workUntil(anyOf(ctx.Done(), teammateDone))
fmt.Println("one of the stop signals arrived (here, the teammate finished)")
```

```bash
working...
one of the stop signals arrived (here, the teammate finished)
```

Pay attention that `ctx.Done()` goes into `anyOf` like any other channel. The context becomes just one more signal among the others.

## But why the `sync.Once`?

The first draft had only `close(out)` inside the `case`. I closed three signals at the same time and ran it 50 times:

```bash
panic: close of closed channel
```

In 40 of them. Two goroutines wake up together, both try to close the same output, and closing a channel twice is a panic. The `once.Do` guarantees a single `close`.

## And the `case <-out`?

It looks useless. The goroutine is there to wait for `c`, why look at its own output?

I removed the `case` and called `anyOf` 100 times with three channels, closing only one of them:

```bash
goroutines alive after 100 calls: 201
```

Whoa! On every call, the two goroutines of the channels that never closed were left stuck waiting. With the `case <-out`, when one signal wins, the others see the closed output and finish.

## Where the example comes from

The code is in [`qualquer.go`](https://github.com/cassiobotaro/concorrencia-go/tree/main/cancelamento), in the `cancelamento` folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), sharing its `main` with the confirmed stop. Heads up: the repository is written in Portuguese, so the function there is called `qualquer` and the worker is `trabalharAte`.

The _or-channel_, by that name, comes from chapter 4 of [Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941294/), by Katherine Cox-Buday. The version there is recursive, it splits the list in half. It works, and there's also the `reflect.Select` one, but the Go Proverbs remind us that "_Clear is better than clever_" and "_Reflection is never clear_". For two or three sources, an explicit `select` is the clearest.

Next up is the _heartbeat_, for the case where nobody said stop. The worker sends a sign of life, and the supervisor decides it died when the sign stops.

Remember that the _or-channel_ is not the _or-done-channel_ from the same book, which wraps the reading of a channel so it also respects a stop signal. And for the opposite direction, hooking a context up to something that doesn't understand contexts, there's `context.AfterFunc` since Go 1.21.

That's it, folks!

See you next time!

{}'s
