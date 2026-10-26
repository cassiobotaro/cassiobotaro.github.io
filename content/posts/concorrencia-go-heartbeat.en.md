+++
title = "Go Concurrency - Heartbeat"
date = "2026-12-03"
publishDate = "2026-12-03"
description = "A slow worker and a stuck worker look the same from the outside. See how a sign of life on every interval tells the two apart, why that sign is sent without blocking, and what the supervisor can and can't do after declaring it dead."
slug = "go-concurrency-heartbeat"
tags = ["go", "concurrency", "goroutines", "channels", "select", "timeout", "heartbeat"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/batimento.mp4" titulo="A worker sending a sign of life and a supervisor waiting for it" >}}

A worker takes three and a half intervals to produce each result. The supervisor reads the results and, if it goes two intervals without news, declares it dead.

I ran it here:

```bash
$ go run .
worker not responding
```

Whoa! It didn't die, it was just taking a while. The supervisor didn't even see the first result.

What if I raise the deadline to four intervals? Then a worker that's really stuck is only found out after four intervals, and if tomorrow the work gets slower, I'm back to the same problem. From the outside, slow and stuck look the same.

## What a heartbeat is

A _heartbeat_ is a signal the worker sends on a channel on every interval, while it works, to say it's still alive.

It also goes by sign of life or _liveness_. The shape used here follows the one from the book [Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941294/), by Katherine Cox-Buday.

The worker returns two channels, one for heartbeats and one for results. Inside it, one `Ticker` for the pulse and another for the work, and on the third result it gets stuck on purpose:

```go
for i := 1; ; {
	select {
	case <-ctx.Done():
		return
	case <-pulse.C:
		// non-blocking send: if nobody is listening, the heartbeat is lost
		select {
		case heartbeat <- struct{}{}:
		default:
		}
	case <-work.C:
		if i == 3 {
			// simulates getting stuck
			time.Sleep(hang)
		}
		select {
		case results <- i:
			i++
		case <-ctx.Done():
			return
		}
	}
}
```

And the supervisor listens to both channels with the same two interval deadline:

```go
func supervisor(interval, hang time.Duration) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	heartbeat, results := worker(ctx, interval, hang)

	for {
		select {
		case <-heartbeat:
			fmt.Println("heartbeat")
		case r := <-results:
			fmt.Println("result:", r)
		case <-time.After(2 * interval):
			fmt.Println("worker not responding")
			return
		}
	}
}
```

```bash
$ go run .
heartbeat
heartbeat
heartbeat
result: 1
heartbeat
heartbeat
heartbeat
heartbeat
result: 2
heartbeat
heartbeat
heartbeat
worker not responding
```

Now the first two results arrive, because in between them the heartbeats keep the supervisor calm. After the second, three heartbeats and silence. The worker got stuck on the third, and two intervals later the supervisor warns.

Notice the `time.After` inside the loop. It's recreated on every pass, like in the [tee with timeout](/en/posts/go-concurrency-tee/), so any heartbeat or result renews the deadline. The deadline isn't "two intervals since the start", it's "two intervals since the last news".

## But why the `select` with `default` on the heartbeat?

My first version sent `heartbeat <- struct{}{}` directly, and the supervisor only listened to the results:

```bash
$ go run .
worker not responding
```

The worker got stuck on the first heartbeat, waiting for someone to read, and never got to produce result 1. A healthy worker declared dead because of its own sign of life.

With the `default`, if nobody is listening at that instant, the signal is lost and the work goes on.

## And after declaring it dead?

Pay attention to the supervisor's `defer cancel()`. When it leaves, it cancels the context, and if the worker starts responding again, it finds `ctx.Done()` and finishes.

But the supervisor doesn't wait for it. A worker that's really stuck may never come back, and Go has no way to kill a goroutine from the outside. Cancellation is a request, and whoever is stuck in a `Sleep`, in a network call with no deadline or in a loop with no `select` won't hear it.

So what the supervisor can do is warn, cancel and move on. The stuck worker is still there, and that's the case the `goroutineleak` profile, available since Go 1.27, helps find.

## Where the example comes from

The code is in the [`batimento`](https://github.com/cassiobotaro/concorrencia-go/tree/main/batimento) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test runs in `synctest`, and since the stuck worker is in a `Sleep`, the test cancels and waits for it to wake up and close the channel, because the bubble requires every goroutine to finish. Heads up: the repository is written in Portuguese, so the worker there is called `trabalhador` and the heartbeat channel is `batimento`.

Remember that the heartbeat interval and the supervisor's deadline are two guesses that need to match. A two interval deadline tolerates one lost heartbeat. A one interval deadline declares dead any worker that hiccups.

Next up is the last one in the series, the daisy-chain. Ten thousand goroutines in a row passing a number along, just to see how much a goroutine costs.

That's it, folks!

See you next time!

{}'s
