+++
title = "Go Concurrency - Fan-out"
date = "2026-10-13"
publishDate = "2026-10-13"
description = "A slow worker holds up the whole queue. See what happens when three goroutines read from the same channel, who decides which value goes to which one, and why a WaitGroup counts better than a channel."
slug = "go-concurrency-fan-out"
tags = ["go", "concurrency", "goroutines", "channels", "fan-out", "waitgroup"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/fan_out.mp4" titulo="Three workers splitting the values of the same channel" >}}

In the [worker](/en/posts/go-concurrency-worker/) the `fmt.Printf` played the role of the processing. Now let's pretend it takes a while.

A `time.Sleep` of 100 milliseconds per value. There are ten values, in other words, one second staring at the screen.

What if I put three workers reading from the same channel?

## What a fan-out is

A fan-out spreads the values of a channel across several goroutines. Each value goes to only one of them, and with that a slow job gets split among whoever is free.

It also goes by work distribution. The article [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines) defines it like this: multiple functions reading from the same channel until it is closed.

The worker got an `id` so we can tell who picked up what:

```go
func worker(id int, in <-chan int) {
	for value := range in {
		fmt.Printf("id: %d processing value: %v\n", id, value)
		// simulates slow processing
		time.Sleep(100 * time.Millisecond)
	}
}

func fanout(in <-chan int, n int) {
	var wg sync.WaitGroup
	for i := range n {
		wg.Go(func() {
			worker(i+1, in)
		})
	}
	// only returns when all n workers are done
	wg.Wait()
}
```

`numberSequence` is the same one from the generators, and `main` sends the ten values to three workers:

```go
func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	fanout(numberSequence(ctx, 1, 10), 3)
}
```

```bash
$ go run .
id: 3 processing value: 1
id: 1 processing value: 2
id: 2 processing value: 3
id: 1 processing value: 5
id: 2 processing value: 4
id: 3 processing value: 6
id: 2 processing value: 7
id: 3 processing value: 8
id: 1 processing value: 9
id: 2 processing value: 10
```

Pay attention to the values. None shows up twice, and none was left out.

I ran it here with one worker and with three. One second against 400 milliseconds.

## But who decides which value goes to which worker?

Nobody. Notice there is no line of code picking the worker, no index, no draw.

When several goroutines are blocked reading the same channel, each send is delivered to only one of them. Whoever is free first gets it. The channel already does the distribution, and `fanout` only has to start the goroutines.

## But what is this `WaitGroup`?

In the worker post `main` waited on a `<-done` to know it had finished. With three workers that would be three channels, or three reads from the same one. And what if there are fifty?

`sync.WaitGroup` is a counter. `wg.Go` starts the goroutine and adds one, and when it returns it subtracts. `wg.Wait()` stays blocked until the counter hits zero.

Hmmm 🤔 But wasn't the whole series about channels?

It was, and it still is. The channels are carrying the data, which is their job. Counting how many goroutines have finished is a smaller problem, and for those Rob Pike recommends the `sync` package. In the talk [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide) he warns "_Don't overdo it_", because sometimes all you need is a counter.

From here on in the series the channels carry the data and the `WaitGroup` only counts who is done.

## Run it one more time

I ran it again and the output changed:

```bash
$ go run .
id: 3 processing value: 2
id: 2 processing value: 3
id: 1 processing value: 1
id: 1 processing value: 4
...
```

The three workers compete for the values, and who decides which one runs at each moment is the Go scheduler, not you.

It's the first time in the series that the order of the values changes from one run to the next. Rob Pike explains this in the talk [Concurrency is not parallelism](https://go.dev/blog/waza-talk). The program describes independent computations, but it doesn't say in which order they run. So if your program only works with one specific order, it is wrong, even if it passes the test today.

## Where the example comes from

The code is in the [`fan_out`](https://github.com/cassiobotaro/concorrencia-go/tree/main/fan_out) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test there uses a single worker, precisely because with three the order changes on every run. Heads up: the repository is written in Portuguese, so the worker there is called `trabalhador`.

Next up is the tee, which is easy to mix up with this one. In the fan-out each value goes to one worker. In the tee each value is copied to all of them.

Keep in mind that `wg.Go` only exists from Go 1.25 on. Before it, it was `wg.Add(1)` before the `go` and `defer wg.Done()` inside the goroutine.

That's it, folks!

See you next time!

{}'s
