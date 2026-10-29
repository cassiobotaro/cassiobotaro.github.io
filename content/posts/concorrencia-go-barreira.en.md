+++
title = "Go Concurrency - Barrier"
date = "2026-11-18"
publishDate = "2026-11-18"
description = "Four goroutines stop at one point and none moves on until the last one arrives. See how a WaitGroup where everyone calls Done and Wait does this, and the two ways to get it wrong: flipping the order and reusing the barrier."
slug = "go-concurrency-barrier"
tags = ["go", "concurrency", "goroutines", "waitgroup", "barrier", "sync"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/barreira.mp4" titulo="Four goroutines reaching a barrier and going through together" >}}

In the [fan-out](/en/posts/go-concurrency-fan-out/) `main` waited for the workers with a `wg.Wait()`. One waiting, several being waited on.

But what about when all of them need to wait for each other? Four goroutines load data in parallel, and none can start computing before all of them finish loading.

## What a barrier is

A barrier is a point where several goroutines stop, and none moves on until the last one arrives.

When there are only two goroutines the name is _rendezvous_, the scheduled meeting.

In Go the barrier is a `sync.WaitGroup` with `Add(n)`, where each goroutine calls `Done` when it arrives and `Wait` right after:

```go
func waitForAll(n int) {
	var barrier sync.WaitGroup
	barrier.Add(n)

	var wg sync.WaitGroup
	for i := range n {
		wg.Go(func() {
			// scaffolding: staggers the arrivals so the output is readable
			time.Sleep(time.Duration(i) * 50 * time.Millisecond)
			fmt.Printf("goroutine %d: reached the barrier\n", i+1)

			barrier.Done()
			barrier.Wait() // releases when the last one calls Done
			fmt.Printf("goroutine %d: passed the barrier\n", i+1)
		})
	}
	wg.Wait()
}

func main() {
	waitForAll(4)
}
```

```bash
$ go run .
goroutine 1: reached the barrier
goroutine 2: reached the barrier
goroutine 3: reached the barrier
goroutine 4: reached the barrier
goroutine 4: passed the barrier
goroutine 3: passed the barrier
goroutine 1: passed the barrier
goroutine 2: passed the barrier
```

The four arrivals, in order because of the `Sleep`, and only then the four passes, in unpredictable order.

Notice that each goroutine calls `Done` and then `Wait`. In every previous post only `main` called `Wait`, and the goroutines were only waited on. Here each one is waited on by the others and waits for the others, and `Wait` can be called by as many goroutines as needed. They all wake up together when the counter hits zero.

Pay attention to goroutine 4. It arrived last and was the first to pass, and it didn't need to know it was the last. Its `Done` brought the counter to zero, and that released everyone, itself included.

There are two `WaitGroup`s in the code. `barrier` is the pattern. `wg` is only there so `main` doesn't finish before the goroutines, like in the fan-out.

## But what if I flip it?

`Wait` before `Done` looks like it would be the same thing. I flipped it:

```bash
$ go run .
fatal error: all goroutines are asleep - deadlock!
```

They all stop at `Wait` waiting for the counter to hit zero, and none of them ever got to call the `Done` that brings it to zero. So the order matters: first I announce I've arrived, then I wait for the others.

## But what about a second round?

If the second phase also ends at a barrier, it's tempting to call `Done` and `Wait` again on the same `WaitGroup`. I did:

```bash
$ go run .
goroutine 1: passed round 1
panic: sync: negative WaitGroup counter
```

And Bam! The `WaitGroup` doesn't go back to `n` on its own. After the first round the counter is at zero, and the first `Done` of the second round takes it to -1.

This barrier is good for one round only. To repeat, it's a new `WaitGroup` per round, or a `sync.Cond`, whose `Broadcast` wakes up every goroutine stopped on its `Wait`. `sync.Cond` isn't part of this series, but the book [Go Concurrency Distilled](https://antonz.org/go-concurrency-distilled/), by Anton Zhiyanov, where this pattern came from, has a chapter on it.

## But why not close a channel?

Closing a channel also releases everyone at once. That's how it went in the [worker](/en/posts/go-concurrency-worker/), with `close(done)`, and it's what `ctx.Done()` does.

The difference is that someone has to decide when to close, and for that they need to know everyone has arrived. In the barrier nobody decides. The last one to arrive releases the others without knowing it's the last.

## Where the example comes from

The code is in the [`barreira`](https://github.com/cassiobotaro/concorrencia-go/tree/main/barreira) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test runs in `synctest` and checks that the four passes come after the fourth arrival, without caring about the order among them. Heads up: the repository is written in Portuguese, so the function there is called `esperarTodas` and the barrier is `barreira`.

Next up is first to respond. The same query goes to several replicas, the first answer wins and the others get cancelled.

Remember that the [semaphore](/en/posts/go-concurrency-semaphore/) and the barrier are opposites. One limits how many go through at a time. The other requires all of them to arrive before any can go through.

That's it, folks!

See you next time!

{}'s
