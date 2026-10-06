+++
title = "Go Concurrency - Worker"
date = "2026-10-06"
publishDate = "2026-10-06"
description = "A goroutine that reads a channel until it closes looks like the simplest pattern in the series, but the last value goes missing almost every time. See why, and how closing a channel works as a signal that the work is done."
slug = "go-concurrency-worker"
tags = ["go", "concurrency", "goroutines", "channels", "worker"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/trabalhador.mp4" titulo="A goroutine consuming values from a channel" >}}

In the [generator](/en/posts/go-concurrency-generators/) a goroutine wrote to the channel and `main` read from it.

Now the roles flip. The one reading is the goroutine.

## What a worker is

A worker is a goroutine that receives values from a channel and processes them until the channel is closed.

It also goes by consumer or sink, but that second name only applies when it's the last stage, that is, when it doesn't pass anything along.

Let's go for the first attempt. `main` sends the integers from 0 to 9 and the worker prints each one:

```go
package main

import "fmt"

func worker(in <-chan int) {
	for value := range in {
		fmt.Printf("value: %v\n", value)
	}
}

func main() {
	in := make(chan int)
	go worker(in)
	for i := range 10 {
		in <- i
	}
	// closing the input ends the worker's range
	close(in)
}
```

Notice the `for value := range in`. The `range` receives one value at a time and ends on its own when the sender closes the channel, so the worker doesn't need a counter or a special value to know it's over.

The `fmt.Printf` is only there to show the execution. In its place goes whatever you need to process.

```bash
$ go run .
value: 0
value: 1
...
value: 8
```

Oops! Where's the 9?

I ran it 200 times here and `value: 9` went missing in 189 of them.

## But doesn't close take care of it?

Closing `in`, though, doesn't wait for the worker to finish processing.

When the last send returns, the worker has received the 9, but may not have printed it yet. `main` closes the channel, returns, and as we saw in the [hello world](/en/posts/go-concurrency-hello-world/), takes along any goroutine still running.

And `time.Sleep` is still a guess, because no fixed amount of time guarantees the work is done.

What's missing is the worker saying it's finished:

```diff
 func main() {
 	in := make(chan int)
-	go worker(in)
+	done := make(chan struct{})
+	go func() {
+		worker(in)
+		// closing the channel says "I'm done" to any number of readers
+		close(done)
+	}()
 	for i := range 10 {
 		in <- i
 	}
 	// closing the input ends the worker's range
 	close(in)
+	<-done
 }
```

Now `main` sits at `<-done` until the worker leaves the loop, and the 9 shows up in every run.

## But why close instead of send?

Notice that to send the signal I closed the `done` channel instead of sending a value on it. Why?

Closing a channel is the usual way in Go to communicate something that happens only once, like "I'm done" or "you can stop". Go releases everyone reading the channel at once, so the signal works for any number of readers.

That's why the channel is a `chan struct{}`, which carries no data at all. Nobody is going to read a value from it, only wait for it to close.

One last detail I want to point out is who closes `done`: the anonymous goroutine over in `main`. The `worker` only processes values and doesn't even know that signal exists.

## Where the example comes from

The code is in the [`trabalhador`](https://github.com/cassiobotaro/concorrencia-go/tree/main/trabalhador) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), along with the test that checks the ten values. Heads up: the repository is written in Portuguese, so the function there is called `trabalhador`.

Next up is the pipeline, which brings the two roles together: each stage is a worker for whoever comes before and a generator for whoever comes after.

Keep in mind that `for i := range 10` only works from Go 1.22 on.

That's it, folks!

See you next time!

{}'s
