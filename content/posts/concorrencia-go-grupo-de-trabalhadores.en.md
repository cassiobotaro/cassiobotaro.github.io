+++
title = "Go Concurrency - Worker pool"
date = "2026-10-22"
publishDate = "2026-10-22"
description = "A fixed number of goroutines split the input and merge the results into a single channel. See how the fan-out and the fan-in become one pattern, and why without the context the whole pool gets stuck holding a result."
slug = "go-concurrency-worker-pool"
tags = ["go", "concurrency", "goroutines", "channels", "worker-pool", "waitgroup", "context"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/grupo.mp4" titulo="Two workers splitting the input and merging the results into a single output" >}}

In the [fan-out](/en/posts/go-concurrency-fan-out/) three workers split a channel, but the result died in a `fmt.Printf`. In the [fan-in](/en/posts/go-concurrency-fan-in/) several goroutines wrote to the same output channel.

What if I put the two together? Several workers reading from the same input and writing the result to the same output.

## What a worker pool is

A worker pool is a fixed number of goroutines waiting for values on an input channel. Each one processes what it picked up, writes the result to an output channel and goes back to the queue.

It also goes by goroutine _pool_, and in Portuguese I call it a group of workers. Here at home my wife calls it a pool of little marmots, and I admit the name stuck.

The worker is the one from the fan-out, but now with an output:

```go
func worker(ctx context.Context, id int, in <-chan int, out chan<- int) {
	for value := range in {
		fmt.Printf("id: %d processed value: %v\n", id, value)
		select {
		case out <- value * 2:
		case <-ctx.Done():
			return
		}
	}
	fmt.Printf("id: %d finished\n", id)
}
```

And the pool fires `n` of them and returns the output:

```go
func workerPool(ctx context.Context, in <-chan int, n int) <-chan int {
	out := make(chan int)
	var wg sync.WaitGroup

	for i := range n {
		wg.Go(func() {
			worker(ctx, i+1, in, out)
		})
	}

	// when every worker is done, closes the output
	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}
```

`numberSequence` is the one from the [generators](/en/posts/go-concurrency-generators/), and `main` sends ten values to two workers:

```go
func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	out := workerPool(ctx, numberSequence(ctx, 1, 10), 2)
	for result := range out {
		fmt.Println(result)
	}
}
```

```bash
$ go run .
id: 1 processed value: 1
id: 1 processed value: 3
2
6
id: 2 processed value: 2
4
...
id: 2 finished
id: 1 finished
```

All ten results show up, doubled and out of order, like in the fan-out.

Notice that `worker` doesn't even know the `WaitGroup` exists. It reads, processes and writes. Whoever fired it is the one counting who has finished, and it's the same goroutine from the fan-in that waits on `wg.Wait()` to close the output.

## But isn't this the fan-out?

On the input side, it is. Several goroutines reading from the same channel, and the channel handing each value to only one of them.

The difference is on the output side. The fan-out only distributed the work, and the pool also merges the results into a single channel, which is exactly what the fan-in did.

So a worker pool is a fan-out on the input and a fan-in on the output. Nothing new, the two patterns joined together.

## But why the select on the send?

It's tempting to write just `out <- value * 2` in the worker. I did, and then I stopped reading the output halfway through, as I already did in the [pipeline](/en/posts/go-concurrency-pipeline/):

```go
for result := range out {
	fmt.Println(result)
	break
}
cancel()
```

I ran it 200 times here and in 170 of them four goroutines stayed alive: `main`, the two workers and the one waiting on `wg.Wait()`.

The `cancel()` shuts down the generator, but each worker has already picked up a value and is stuck on `out <- value * 2`, waiting for someone to read. Nobody will. The `WaitGroup` never reaches zero, the output never closes, and the `wg.Wait()` goroutine gets stuck along with them.

With the `select`, `ctx.Done()` pulls the workers out of the send, the counter hits zero and the output gets closed just the same. In all 200 runs only `main` was left.

It's the nagging doubt from the [hello world](/en/posts/go-concurrency-hello-world/), the goroutine leak. With a single worker it was one stuck goroutine. Here it's the whole pool.

## Where the example comes from

The code is in the [`grupo`](https://github.com/cassiobotaro/concorrencia-go/tree/main/grupo) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test there uses a single worker, for the same reason as the fan-out. Heads up: the repository is written in Portuguese, so the pool there is called `grupoDeTrabalhadores` and the worker is `trabalhador`.

Next up is backpressure, which showed up in passing in the [tee](/en/posts/go-concurrency-tee/), when everyone moved at the pace of the slowest worker.

Remember that how many workers to put in the pool depends on what they do. For heavy computation, more workers than cores doesn't help. For waiting on network or disk, it can be a lot more, because most of the time they're just sitting there.

That's it, folks!

See you next time!

{}'s
