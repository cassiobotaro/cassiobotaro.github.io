+++
title = "Go Concurrency - Fan-in"
date = "2026-10-20"
publishDate = "2026-10-20"
description = "Three input channels and a single range to read them all. See why closing the output is the hard part, what happens when each goroutine closes it on its own, and when a lone select does the job."
slug = "go-concurrency-fan-in"
tags = ["go", "concurrency", "goroutines", "channels", "fan-in", "waitgroup", "select"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/fan_in.mp4" titulo="Several input channels combined into a single output channel" >}}

In the [tee](/en/posts/go-concurrency-tee/) one channel became several copies. In the [fan-out](/en/posts/go-concurrency-fan-out/) one channel became several workers.

Now it's the other way around. I have three generators and I want to read everything with a single `range`.

## What a fan-in is

A fan-in copies the values of several input channels into a single output channel.

It also goes by _merge_, and Rob Pike calls it multiplexing in the talk [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide).

The first attempt is one goroutine per input, all of them writing to the same output:

```go
func fanin(ins ...<-chan int) <-chan int {
	out := make(chan int)
	for _, in := range ins {
		go func() {
			for value := range in {
				out <- value
			}
		}()
	}
	return out
}

func main() {
	ch := fanin(
		numberSequence(1, 10),
		numberSequence(11, 20),
		numberSequence(21, 30),
	)
	for value := range ch {
		fmt.Printf("value: %v\n", value)
	}
}
```

`numberSequence` is the one from the [generators](/en/posts/go-concurrency-generators/) post, without a context for now.

```bash
$ go run .
value: 21
value: 22
value: 1
...
value: 10
fatal error: all goroutines are asleep - deadlock!
```

All thirty values showed up, shuffled like in the fan-out, and at the end the program died.

Notice that nobody closes `out`, and the `range` in `main` sits waiting for a thirty-first value that never comes.

## But it's just a matter of closing it, right?

Each goroutine knows when its input is done. So it closes the output:

```diff
 		go func() {
 			for value := range in {
 				out <- value
 			}
+			// my input is done, I close the output
+			close(out)
 		}()
```

I ran it 100 times here. In 6 of them all thirty values came out. In 58 the program finished with no error at all, but with values missing. And in the other 36, bam!

```bash
panic: send on closed channel
```

![Gopher panicking](/images/gopher-panic.png "System panic")

There are three goroutines and a single channel. The first one to finish closes the output, the `range` in `main` ends and the program exits, taking whatever was left along with it. If any of the others still tries to send, it's a _panic_.

The worst case is the middle one. A _panic_ you can see, a value silently disappearing you can't.

## The solution

The output can only be closed after the last input is done, and by a single goroutine. Counting who has finished is exactly the job of the `sync.WaitGroup` that showed up in the fan-out:

```go
func fanin(ins ...<-chan int) <-chan int {
	out := make(chan int)
	var wg sync.WaitGroup

	for _, in := range ins {
		wg.Go(func() {
			for value := range in {
				out <- value
			}
		})
	}

	// when every input is done, closes the output
	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}
```

Pay attention to the goroutine at the end. Why not call `wg.Wait()` directly before the `return`? Because `main` hasn't even received the channel yet, and the goroutines would sit there sending to nobody. _Deadlock_ again.

Now all thirty values show up on every run.

## What about the context?

If `main` does a `break` halfway through, the problem from the [pipeline](/en/posts/go-concurrency-pipeline/) comes back, and here cancelling the generators isn't enough. The fan-in goroutine that already picked up a value is stuck on `out <- value` holding it, the `WaitGroup` never reaches zero and the output never closes.

So `ctx` goes into the fan-in too, and every `out <- value` becomes the same `select` with `ctx.Done()` from the pipeline.

## But what if there are only two inputs?

In the same talk Rob Pike shows a version with a single goroutine and a `select`, which passes along the value from whichever is ready first. His runs forever, this one handles the inputs closing:

```go
func faninSelect(ctx context.Context, in1, in2 <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for in1 != nil || in2 != nil {
			var value int
			var ok bool
			select {
			case value, ok = <-in1:
				if !ok {
					in1 = nil
					continue
				}
			case value, ok = <-in2:
				if !ok {
					in2 = nil
					continue
				}
			case <-ctx.Done():
				return
			}
			select {
			case out <- value:
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}
```

The trick is in `in1 = nil`, which Sameer Ajmani shows in the talk [Advanced Go Concurrency Patterns](https://go.dev/talks/2013/advconc.slide). Reading from a `nil` channel blocks forever, so when an input closes, its `case` drops out of the `select`. When both become `nil`, the loop ends.

And since only one goroutine writes to the output, it closes it itself in the `defer`, with no `WaitGroup`.

But the `case`s of a `select` are fixed in the code. With a _slice_ of channels, it's back to one goroutine per input.

## Where the example comes from

The code is in the [`fan_in`](https://github.com/cassiobotaro/concorrencia-go/tree/main/fan_in) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), with both versions. Heads up: the repository is written in Portuguese, so the inputs there are called `entradas` and the output is `saida`.

Next up is the worker pool, which puts this one and the fan-out together.

Whoever writes to a channel is the one who closes it. When several goroutines are writing, someone from the outside has to wait for all of them before closing.

That's it, folks!

See you next time!

{}'s
