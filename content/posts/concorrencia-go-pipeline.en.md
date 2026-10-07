+++
title = "Go Concurrency - Pipeline"
date = "2026-10-08"
publishDate = "2026-10-08"
description = "A stage reads from a channel, transforms the value and writes to another. See how a single close at the top shuts down the whole chain, and why the same context has to go through every stage so nobody gets stuck."
slug = "go-concurrency-pipeline"
tags = ["go", "concurrency", "goroutines", "channels", "pipeline", "context"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/pipeline.mp4" titulo="Stages chained by channels, each one transforming what it receives" >}}

In the [generator](/en/posts/go-concurrency-generators/) a goroutine wrote to the channel. In the [worker](/en/posts/go-concurrency-worker/) it read from it.

What if it does both? It reads from a channel, transforms the value and writes to another.

## What a pipeline is

A pipeline is a chain of stages connected by channels. Each stage is a function that receives a channel, starts a goroutine to read from it and returns the channel where it writes the result.

In other words, each stage is a worker for whoever comes before and a generator for whoever comes after.

Let's start with a stage that doubles what it receives:

```go
func double(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for value := range in {
			out <- value * 2
		}
		// when the input closes, the output closes too
		close(out)
	}()
	return out
}
```

Notice the signature. `double` receives a `<-chan int` and returns another `<-chan int`. Since the output has the same type as the input, you can plug one `double` into another:

```go
func main() {
	for value := range double(double(numberSequence(1, 10))) {
		fmt.Printf("value: %v\n", value)
	}
}
```

`numberSequence` is the same one from the generators post, without context for now. It generates 1 to 10, the first `double` multiplies by two and the second multiplies again:

```bash
$ go run .
value: 4
value: 8
...
value: 40
```

That's three goroutines working at the same time, and each channel carries one value at a time.

## But who closed main's channel?

Notice that `main` didn't close any channel, and its `range` still ended.

The one who closed it was the generator, after sending the 10. The first `double`'s `range` ended, it closed its own output, the second one's `range` ended, it closed its own, and `main`'s `range` was over.

So a `close` at the top shuts down the whole chain, and each stage only needs to close the channel it created itself.

## What if I stop reading halfway?

What if, like in the generator, I `break` halfway through?

I stopped right after the first value and counted who was still alive:

```go
for value := range double(double(numberSequence(1, 10))) {
	if value == 8 {
		break
	}
	fmt.Printf("value: %v\n", value)
}
fmt.Println("goroutines alive:", runtime.NumGoroutine())
// value: 4
// goroutines alive: 4
```

Oops! `main` is one of them. The other three are the generator and the two stages, each one stuck on a send nobody is going to read.

In the generator one goroutine was left behind. Here one is left per stage, and the longer the pipeline, the more goroutines are left over.

## The solution

The solution is the same as in the generator, a `context.Context`. The difference is that it has to go through the whole chain:

```diff
-func double(in <-chan int) <-chan int {
+func double(ctx context.Context, in <-chan int) <-chan int {
 	out := make(chan int)
 	go func() {
+		defer close(out)
 		for value := range in {
-			out <- value * 2
+			select {
+			case out <- value * 2:
+			case <-ctx.Done():
+				return
+			}
 		}
-		// when the input closes, the output closes too
-		close(out)
 	}()
 	return out
 }
```

`numberSequence` goes back to the version with context from the generators post, and `main` passes the same `ctx` to all three:

```go
ctx, cancel := context.WithCancel(context.Background())
values := double(ctx, double(ctx, numberSequence(ctx, 1, 10)))
for value := range values {
	if value == 8 {
		break
	}
	fmt.Printf("value: %v\n", value)
}
cancel()
// drain until the last stage closes
for range values {
}
fmt.Println("pipeline finished")
// value: 4
// pipeline finished
```

A single `cancel()` and all three goroutines go away. Each one leaves through `ctx.Done()`, without depending on the next stage reading again, and closes the channel it created in the `defer`.

Actually, since `main` keeps draining, sometimes the `select` picks the send, and the stage ends up leaving because its input closed. The end result is the same.

It's what the article [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines), by Sameer Ajmani, calls explicit cancellation.

## What about when a stage fails?

The example doesn't handle errors, and there isn't just one way to do it. The stage can return a second channel just for errors and stop at the first one, or send the error along with the value in a `struct` and let the reader decide. The stage can also receive an error channel and keep going.

I think it depends on whether an error should stop the other stages or not, and this comes back later in the series, when we get to the semaphore.

## Where the example comes from

The code is in the [`pipeline`](https://github.com/cassiobotaro/concorrencia-go/tree/main/pipeline) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), with the test that checks the ten values multiplied by four. Heads up: the repository is written in Portuguese, so the stage there is called `dobro`.

Next up is fan-out. When a single stage can't keep up, several workers read from the same channel.

Keep in mind that if `ctx` goes into the chain, it goes into every stage. It only takes one being left out for that stage to get stuck on the send.

That's it, folks!

See you next time!

{}'s
