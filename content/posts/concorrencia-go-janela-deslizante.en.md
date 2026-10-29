+++
title = "Go Concurrency - Sliding window"
date = "2026-11-09"
publishDate = "2026-11-09"
description = "The consumer fell behind and the value from four seconds ago no longer matters. See how to keep only the most recent ones by dropping the oldest, and how a nil channel turns a select case on and off."
slug = "go-concurrency-sliding-window"
tags = ["go", "concurrency", "goroutines", "channels", "select", "sliding-window"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/janelas_deslizantes.mp4" titulo="A three-value window dropping the oldest when the consumer falls behind" >}}

In the [backpressure](/en/posts/go-concurrency-backpressure/) post the slow consumer made the producer wait, and nothing got lost.

But not every value deserves to wait. If the producer is a position sensor and the consumer fell four seconds behind, the reading from four seconds ago is no longer any use. What matters is the newest one.

## What a sliding window is

A sliding window keeps only the `n` most recent values. When a new one arrives and the window is full, the oldest one leaves to make room.

It also goes by _drop-oldest buffer_. Don't confuse it with a _ring buffer_, which is a way of storing the data. The window is the drop rule.

A single goroutine takes care of the queue and reacts in the `select` to whatever happens first:

```go
func slidingWindow(in <-chan int, out chan<- int, size int) {
	defer close(out)
	var queue []int

	for in != nil || len(queue) > 0 {
		// the send case only exists when there is something in the queue
		var send chan<- int
		var head int
		if len(queue) > 0 {
			send = out
			head = queue[0]
		}

		select {
		case value, ok := <-in:
			if !ok {
				// input closed: from here on it only drains the queue
				in = nil
				continue
			}
			if len(queue) == size {
				fmt.Printf("Sliding Window: Buffer full, dropped %v to add %v.\n", queue[0], value)
				queue = queue[1:]
			}
			queue = append(queue, value)

		case send <- head:
			fmt.Printf("Sliding Window: Sent %v to the consumer.\n", head)
			queue = queue[1:]
		}
	}
}
```

`main` hooks up a producer that sends one value per second to a consumer that takes four seconds on each one, with a window of three:

```go
values := numberSequence(ctx, 1, 10)
out := make(chan int)
done := make(chan struct{})
go slowReader(out, done)
slidingWindow(values, out, 3)
<-done
```

```bash
$ go run .
Consumer: Received 1
Consumer: Received 2
Sliding Window: Buffer full, dropped 3 to add 6.
Sliding Window: Buffer full, dropped 4 to add 7.
Sliding Window: Buffer full, dropped 5 to add 8.
Consumer: Received 6
Sliding Window: Buffer full, dropped 7 to add 10.
Consumer: Received 8
Consumer: Received 9
Consumer: Received 10
```

The consumer saw 1, 2, 6, 8, 9 and 10. The other four went out the window while it was busy, and the producer never waited.

Pay attention that the order held. What the window loses is values, not sequence.

## But what's this `nil` channel?

Look at the `var send chan<- int`. When the queue is empty, it stays `nil`, and a `case` with a `nil` channel is never picked by the `select`. In other words, the send `case` disappears while there's nothing to send.

It's the same trick from the [fan-in with select](/en/posts/go-concurrency-fan-in/), and it shows up again when the input closes. The `in = nil` turns off the read `case`, and the loop keeps going only to drain the queue.

Hmmm 🤔 What if I leave the send `case` always on, sending `out <- head` directly?

I ran it 20 times here. In 12 of them the consumer received a 0 that never went into the window, because `head` is zero when the queue is empty. And sometimes not even that:

```bash
panic: runtime error: slice bounds out of range [1:0]
```

It's the `queue = queue[1:]` running with an empty queue.

## But why a single goroutine?

Notice that producer and consumer never touch the `queue`. Only the window goroutine reads and writes it, so there's no contention and no need for a _mutex_.

An earlier version of this example used a buffered channel shared by two goroutines, and it had a race that every now and then froze the program. This has a name, state-owning goroutine, and it gets a post of its own later in the series.

## Where the example comes from

The code is in the [`janelas_deslizantes`](https://github.com/cassiobotaro/concorrencia-go/tree/main/janelas_deslizantes) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test there does without the clock: it sends five values with nobody reading the output, and checks that the window of three dropped 1 and 2. Heads up: the repository is written in Portuguese, so the function there is called `janelaDeslizante` and the queue is `fila`.

Keep in mind that `queue[1:]` doesn't free memory right away. The backing _array_ stays there until an `append` reallocates, which doesn't matter for a window of three, but does for one of three million.

Next up is request and response, where the message carries the channel on which whoever asked waits for the answer.

That's it, folks!

See you next time!

{}'s
