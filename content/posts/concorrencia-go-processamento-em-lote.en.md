+++
title = "Go Concurrency - Batch processing"
date = "2026-11-04"
publishDate = "2026-11-04"
description = "Items arrive one by one and the database would rather get a hundred at once. See how to group them into batches by size, by time or on demand, and why reusing the previous batch's slice corrupts what the consumer is still reading."
slug = "go-concurrency-batch-processing"
tags = ["go", "concurrency", "goroutines", "channels", "batch", "timer", "slice"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/lote.mp4" titulo="Items arriving one by one and leaving grouped in batches" >}}

An event queue where each event becomes an `INSERT`. A thousand events per second, a thousand round trips to the database per second.

The database accepts a hundred rows in a single request. But the events don't arrive a hundred at a time, they arrive one by one.

## What batch processing is

Batch processing groups items that arrive one at a time, so the consumer can process them in blocks.

It also goes by _batching_ or _micro-batching_.

A batch goes out in three ways. When it fills up, when a deadline passes without it filling up, so an item doesn't wait for company forever, and on demand, through a flush channel.

```go
func batchProcessing(in <-chan req, flush <-chan struct{}, batchSize int, interval time.Duration) <-chan []req {
	out := make(chan []req)
	go func() {
		defer close(out)
		buf := make([]req, 0, batchSize)

		// starts stopped, because there is no batch yet
		deadline := time.NewTimer(interval)
		deadline.Stop()

		flushBatch := func() {
			if len(buf) == 0 {
				return
			}
			deadline.Stop()
			out <- buf
			buf = make([]req, 0, batchSize)
		}

		for {
			select {
			case item, ok := <-in:
				if !ok {
					// input closed: the partial batch still goes out
					flushBatch()
					return
				}
				// first item of the batch: starts counting the deadline
				if len(buf) == 0 {
					deadline.Reset(interval)
				}
				buf = append(buf, item)
				if len(buf) == batchSize {
					flushBatch()
				}
			case <-deadline.C:
				flushBatch()
			case <-flush:
				flushBatch()
			}
		}
	}()
	return out
}
```

`main` asks for batches of three items or 100 milliseconds, whichever comes first, and tests all three ways:

```go
out := batchProcessing(in, flush, 3, 100*time.Millisecond)
done := batchProcessor(out)

// three items fill the batch
in <- req{value: 1}
in <- req{value: 2}
in <- req{value: 3}

// two items and a manual flush
in <- req{value: 4}
in <- req{value: 5}
flush <- struct{}{}

// a single item, and the deadline passes
in <- req{value: 6}
time.Sleep(150 * time.Millisecond)

// two items, and closing the input flushes the rest
in <- req{value: 7}
in <- req{value: 8}
close(in)
<-done
```

`batchProcessor` is the usual worker, reading one `[]req` at a time and closing `done` at the end.

```bash
$ go run .
processing batch with values: [{1} {2} {3}]
processing batch with values: [{4} {5}]
processing batch with values: [{6}]
processing batch with values: [{7} {8}]
```

Pay attention to item 6. It went out alone, without filling the batch and without anyone asking, because the 100 milliseconds passed.

Also notice the `deadline.Reset` inside the `if len(buf) == 0`. The deadline counts from the first item of each batch, not from the wall clock. A `time.Ticker` would keep time on its own, and a batch started right before the tick would go out with one item. It's the same reason as in the [ticket system](/en/posts/go-concurrency-ticket-system/).

## But why not reuse the slice?

Look at the `buf = make([]req, 0, batchSize)` after the send. One `make` per batch. It's tempting to swap it for `buf = buf[:0]`, which resets the length and keeps the memory.

I swapped it. And to make it look like a real database, I let the consumer take 50 milliseconds between receiving the batch and reading its contents:

```bash
$ go run . reuse
processing batch with values: [{4} {5} {6}]
processing batch with values: [{4} {5} {6}]
```

Whoa! The batch `[{4} {5} {6}]` showed up twice, and items 1, 2 and 3 vanished.

A _slice_ is just a window onto an _array_ underneath. The `out <- buf` handed over the window, but `buf[:0]` kept pointing at the same _array_, and the following `append` calls wrote over what the consumer hadn't read yet.

With the `make`, each batch has its own _array_, and the consumer can take as long as it wants. That's the price of passing a _slice_ through a channel.

## Where the example comes from

The code is in the [`lote`](https://github.com/cassiobotaro/concorrencia-go/tree/main/lote) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test runs the whole `main` inside `synctest`, so the 150 millisecond `time.Sleep` costs nothing. Heads up: the repository is written in Portuguese, so the function there is called `processamentoLotes` and the reuse mode is `go run . reaproveitar`.

Next up is the sliding window, the one I owed you back in the [backpressure](/en/posts/go-concurrency-backpressure/) post. When the consumer can't keep up, instead of slowing down the producer, it drops the oldest value.

Remember that calling `deadline.Stop()` without draining `deadline.C` is only correct since Go 1.23. Before that, if the batch filled up at the same instant the timer fired, the tick stayed stored and the next batch would go out early.

That's it, folks!

See you next time!

{}'s
