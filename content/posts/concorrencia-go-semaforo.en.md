+++
title = "Go Concurrency - Semaphore"
date = "2026-10-29"
publishDate = "2026-10-29"
description = "One goroutine per task, but only three running at the same time. See how a buffered channel becomes a semaphore, how it differs from the worker pool, and how errgroup handles the error the series had been ignoring."
slug = "go-concurrency-semaphore"
tags = ["go", "concurrency", "goroutines", "channels", "semaphore", "errgroup", "buffer"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/semaforo.mp4" titulo="Ten tasks competing for three slots" >}}

In the [worker pool](/en/posts/go-concurrency-worker-pool/) I fixed how many goroutines exist. In [backpressure](/en/posts/go-concurrency-backpressure/) a channel's capacity held the producer back.

But what if I have ten files to download, and the server kicks out anyone who opens more than three connections? I want one goroutine per file, and only three of them downloading at the same time.

## What a semaphore is

A buffered channel with capacity `n` works as a semaphore. Sending takes a slot, and blocks when all of them are taken. Receiving frees a slot.

It also goes by _bounded parallelism_, which is the name used in the article [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines), by Sameer Ajmani.

Let's fire ten tasks at once, with three slots:

```go
func runTasks(tasks, limit int) {
	// each value in the buffer is a taken slot
	sem := make(chan struct{}, limit)

	var wg sync.WaitGroup
	// just so we can see how many are running
	var active atomic.Int32

	for i := range tasks {
		wg.Go(func() {
			sem <- struct{}{}        // takes a slot, or waits for one
			defer func() { <-sem }() // gives the slot back when done

			fmt.Printf("task %2d started, active: %d\n", i+1, active.Add(1))
			time.Sleep(100 * time.Millisecond)
			active.Add(-1)
		})
	}

	wg.Wait()
}

func main() {
	runTasks(10, 3)
}
```

```bash
$ go run .
task  2 started, active: 1
task 10 started, active: 2
task  6 started, active: 3
task  4 started, active: 3
...
task  9 started, active: 3
```

Pay attention to the `active` column. It goes up to 3 and never past that, even though all ten goroutines already exist from the first iteration of the loop.

Notice the first two lines of the goroutine. `sem <- struct{}{}` only returns when there's room for one more value in the buffer, in other words, when someone gave a slot back. And the `defer` guarantees the slot goes back even if the task _panics_ halfway through.

I measured it here with ten tasks of 100 milliseconds. Limit 1, one second. Limit 3, 400 milliseconds. Limit 10, 100 milliseconds.

It's one of the few cases where the channel buffer isn't fine tuning. The capacity is the limit itself.

## But isn't this the worker pool?

It looks like it, and both solve the same problem. The difference is who exists.

In the pool there are three goroutines, and they pull values from a channel. Here there are ten, one per task, and only three move forward at a time. The other seven were born and sat waiting on `sem <- struct{}{}`.

This makes a difference when the tasks are already in your hands, in a _slice_, and not arriving through a channel. Each one becomes a `wg.Go` with its own arguments, without needing an input channel to queue them up.

## And when a task fails?

In the [pipeline](/en/posts/go-concurrency-pipeline/) I left that question for later. The time has come.

The slot channel limits and the `WaitGroup` waits. What's missing is the error, and the `golang.org/x/sync/errgroup` package puts all three into a single type:

```go
func runTasksErrgroup(tasks, limit, failing int) error {
	// the context is cancelled on the first error
	g, ctx := errgroup.WithContext(context.Background())
	// the three slots
	g.SetLimit(limit)

	for i := range tasks {
		// blocks when the slots run out
		g.Go(func() error {
			// whoever hasn't started yet gives up
			if ctx.Err() != nil {
				fmt.Printf("task %2d cancelled\n", i+1)
				return ctx.Err()
			}
			fmt.Printf("task %2d started\n", i+1)
			if i+1 == failing {
				return fmt.Errorf("task %d failed", i+1)
			}
			time.Sleep(100 * time.Millisecond)
			return nil
		})
	}

	// waits for all of them and returns the first error
	return g.Wait()
}
```

> :warning: `errgroup` lives outside the standard library. Install it with `go get golang.org/x/sync/errgroup`.

With ten tasks, three slots and task 2 failing:

```bash
$ go run .
task  3 started
task  2 started
task  1 started
task  4 cancelled
...
task 10 cancelled
errgroup: task 2 failed
```

Tasks 1 and 3 started along with 2 and finish normally. The other seven, when they get a slot, find the context cancelled and don't even start. I ran it 200 times here and seven were cancelled every single time.

## Where the example comes from

The code is in the [`semaforo`](https://github.com/cassiobotaro/concorrencia-go/tree/main/semaforo) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), with both versions. The test uses a single slot, because with one slot the order is fixed. Heads up: the repository is written in Portuguese, so the functions there are called `executarTarefas` and `executarTarefasErrgroup`.

Next up is the ticket system. The semaphore limits how many tasks run at the same time, and the ticket limits how many start per second.

`sem <- struct{}{}` waits for the slot without looking at the context. If the caller cancels, the goroutine stays stuck right there. For the wait to respect cancellation, the send goes inside a `select` with `ctx.Done()`, or you use `golang.org/x/sync/semaphore`, whose `Acquire` already takes the `ctx`.

That's it, folks!

See you next time!

{}'s
