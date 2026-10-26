+++
title = "Go Concurrency - Backpressure"
date = "2026-10-27"
publishDate = "2026-10-27"
description = "A slow consumer and a producer that doesn't know it. See how a channel's capacity holds the producer back without a single extra line of code, what the buffer really changes, and what to do when waiting isn't an option."
slug = "go-concurrency-backpressure"
tags = ["go", "concurrency", "goroutines", "channels", "backpressure", "buffer"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/backpressure.mp4" titulo="A bounded queue between the producer and a slow consumer" >}}

In the [tee](/en/posts/go-concurrency-tee/) a 250 millisecond worker held back the other one and the generator along with it, and the program took 2.5 seconds. I said that had a name and that I'd come back to it.

I'm back.

## What backpressure is

Backpressure is when a slow consumer makes the producer slow down, instead of letting the work pile up without limit. Nothing gets dropped, and the one who waits is the producer.

It also goes by bounded queue, and in Portuguese I call it _contrapressão_.

In Go this already comes built into channels. The channel's capacity is the maximum slack between whoever produces and whoever consumes, and when it runs out, the send blocks.

Let's see. The producer generates ten values as fast as it can and the consumer takes 200 milliseconds on each one:

```go
func producer(out chan<- int, n int) {
	defer close(out)
	for i := 1; i <= n; i++ {
		// asks "can I send now?" without blocking
		select {
		case out <- i:
		default:
			fmt.Printf("Producer: queue full when sending %d\n", i)
			// and then sends the normal way, waiting
			out <- i
		}
		fmt.Printf("Producer: sent %d\n", i)
	}
}

func slowConsumer(in <-chan int, done chan<- struct{}) {
	defer close(done)
	for value := range in {
		fmt.Printf("Consumer: processing %d\n", value)
		time.Sleep(200 * time.Millisecond)
	}
}
```

And `main` puts a three-slot queue between the two:

```go
func main() {
	queue := make(chan int, 3)
	done := make(chan struct{})

	go slowConsumer(queue, done)
	producer(queue, 10)
	<-done
}
```

```bash
$ go run .
Producer: sent 1
Producer: sent 2
Producer: sent 3
Producer: queue full when sending 4
Consumer: processing 1
Producer: sent 4
Producer: queue full when sending 5
Consumer: processing 2
...
Consumer: processing 10
```

The first three go in at once. From the fourth on, each send waits for the consumer to take one out of the queue, in other words, the producer started moving at 200 milliseconds per value.

Notice that the producer has no line waiting for the consumer. It just writes to the channel, and the full channel does the rest.

The `select` with `default` is there only so we can see the queue fill up. The `default` runs when the send can't happen at that instant, prints the warning and does the usual blocking send. Without the `select` the same thing happens, silently.

## But shouldn't the buffer speed things up?

Hmmm 🤔 I thought so too. I took out the `Printf`s, measured when the producer finishes sending and when the program finishes, and varied the queue capacity:

```bash
$ go run . 0
Producer: finished sending in 1.8s
capacity 0: done in 2s
$ go run . 3
Producer: finished sending in 1.2s
capacity 3: done in 2s
$ go run . 100
Producer: finished sending in 0s
capacity 100: done in 2s
```

The program takes 2 seconds in all three cases. That's ten values of 200 milliseconds and only one consumer. The buffer doesn't change how long the work takes, it only changes how long the producer spends waiting.

With capacity 100 it didn't even wait. Sounds great, but all ten values went into memory, and the consumer stayed way behind at the same pace. Swap ten for ten million and the queue that "never fills up" is precisely the one that grows out of control.

So what backpressure gives you is a known ceiling for memory and no lost values. What it charges you is a blocked producer.

## But what if the producer can't wait?

If whoever produces is an HTTP _handler_, blocking means holding the caller's connection. That's not always possible.

The alternative is the same `select` with `default` from the example, but without the blocking send afterwards. If it doesn't fit in the queue right now, the `default` returns an error, and a server would answer something like `503` or `429`. This is load shedding.

The difference from the sliding window, which is still coming in the series, is who loses out. In load shedding it's the new value, which never even gets in. In the window it's the oldest one, which leaves the queue to make room.

Wait, reject the new one or drop the old one. There's no right answer, it depends on what your system can handle.

## Where the example comes from

The code is in the [`backpressure`](https://github.com/cassiobotaro/concorrencia-go/tree/main/backpressure) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test there runs inside `synctest`, with a fake clock, so the 200 milliseconds cost nothing. Heads up: the repository is written in Portuguese, so the producer there is called `produtor` and the consumer is `consumidorLento`.

Next up is the semaphore, which uses a buffered channel to limit how many goroutines run at the same time.

Remember that the buffer removes the synchronization between whoever sends and whoever receives. That's why the series uses unbuffered channels whenever it can, and the buffer only shows up when it's the very idea of the pattern, like here.

That's it, folks!

See you next time!

{}'s
