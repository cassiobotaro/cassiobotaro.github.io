+++
title = "Go Concurrency - Tee"
date = "2026-10-15"
publishDate = "2026-10-15"
description = "Two consumers and both need to see every value. See how to copy one channel into several, what a slow consumer does to the rest, and what you lose when the tee decides not to wait."
slug = "go-concurrency-tee"
tags = ["go", "concurrency", "goroutines", "channels", "tee", "broadcast", "timeout"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/tee.mp4" titulo="Each value of a channel copied to every output" >}}

In the [fan-out](/en/posts/go-concurrency-fan-out/) each value went to only one worker.

But what if both need to see everything? One writes to the log and the other updates a metric, for example. Neither of them can miss a value.

## What a tee is

A tee copies each value of an input channel to all the output channels. The name comes from the Unix `tee` command, which duplicates whatever it receives.

It also goes by _broadcast_, but it is not a _pub/sub_, because the outputs are fixed.

The implementation is one loop inside the other, with the same `select` from the [pipeline](/en/posts/go-concurrency-pipeline/) on each send:

```go
func tee(ctx context.Context, in <-chan int, outs ...chan<- int) {
	// closes the outputs on the way out, both at the end of the input and on cancellation
	defer func() {
		for _, out := range outs {
			close(out)
		}
	}()
	for value := range in {
		for _, out := range outs {
			select {
			case out <- value:
			case <-ctx.Done():
				return
			}
		}
	}
}
```

Notice the `...chan<- int`. It is the opposite of the `<-chan int` the series has used so far. These are send-only channels, and the compiler stops the tee from reading from an output by mistake.

And if a worker stops reading halfway through, `ctx.Done()` pulls the tee out of the send instead of leaving it stuck, together with the generator behind it.

The worker is the one from the [fan-out](/en/posts/go-concurrency-fan-out/), with the delay turned into a parameter. `main` creates two outputs, one worker for each, and sends the sequence to the tee:

```go
func worker(id int, in <-chan int, delay time.Duration) {
	for value := range in {
		fmt.Printf("id: %d value: %d\n", id, value)
		time.Sleep(delay)
	}
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	out1 := make(chan int)
	out2 := make(chan int)

	var wg sync.WaitGroup
	wg.Go(func() { worker(1, out1, 0) })
	wg.Go(func() { worker(2, out2, 0) })

	tee(ctx, numberSequence(ctx, 1, 10), out1, out2)
	wg.Wait()
}
```

```bash
$ go run .
id: 2 value: 1
id: 1 value: 1
id: 1 value: 2
...
id: 1 value: 10
```

Pay attention: now each value shows up twice, once per worker. In the fan-out it was the other way around, and that is the easiest way not to mix the two up.

## But what if a worker is slow?

The channels have no _buffer_, so `out <- value` only returns when the worker on that output has picked the value up, and the tee only goes back to the input after all of them.

Let's give worker 2 250 milliseconds per value:

```diff
 	wg.Go(func() { worker(1, out1, 0) })
-	wg.Go(func() { worker(2, out2, 0) })
+	wg.Go(func() { worker(2, out2, 250*time.Millisecond) })
```

I ran it here and the program took 2.5 seconds. Whoa! Worker 1 takes no time at all, but it printed at the same pace as worker 2, and the generator was left waiting too.

In other words, nobody loses a message, but everybody moves at the pace of the slowest. This has a name, backpressure, and it comes back later in the series.

## But what if I don't want to wait?

The tee can give up on a send after a while. The `select` of each send gets one more `case`, a `time.After`, and whichever happens first wins:

```diff
-func tee(ctx context.Context, in <-chan int, outs ...chan<- int) {
+func teeWithTimeout(ctx context.Context, in <-chan int, timeout time.Duration, outs ...chan<- int) {
 ...
 	for value := range in {
-		for _, out := range outs {
+		for i, out := range outs {
+			// one select per output: the send, the deadline or the cancellation wins
 			select {
 			case out <- value:
+			case <-time.After(timeout):
+				// warns instead of dropping silently
+				fmt.Printf("tee: dropped on timeout, out=%d value=%d\n", i+1, value)
 			case <-ctx.Done():
 				return
 			}
 		}
 	}
```

With the sequence from 1 to 5 and the deadline at 100 milliseconds:

```go
teeWithTimeout(ctx, numberSequence(ctx, 1, 5), 100*time.Millisecond, out1, out2)
```

Part of what was going to worker 2 gets dropped:

```bash
$ go run . | grep -v "id: 1"
id: 2 value: 1
tee: dropped on timeout, out=2 value=2
tee: dropped on timeout, out=2 value=3
id: 2 value: 4
tee: dropped on timeout, out=2 value=5
```

Worker 2 only saw 1 and 4, and the whole program took half a second instead of 1.25 seconds.

But notice what was traded away. The guarantee of the tee was that everybody sees everything, and the slow worker just lost that. That is why the example warns on every drop.

## Where the example comes from

The code is in the [`tee`](https://github.com/cassiobotaro/concorrencia-go/tree/main/tee) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), with both versions and a test that checks the drops. Heads up: the repository is written in Portuguese, so the worker there is called `trabalhador` and the outputs are `saida1` and `saida2`.

Next up is the fan-in, with several channels turning into one.

Keep in mind that up to Go 1.22 each `time.After` inside a loop left a timer alive until it fired. This only changed in Go 1.23, and only as long as the `go.mod` declares `go 1.23` or newer.

That's it, folks!

See you next time!

{}'s
