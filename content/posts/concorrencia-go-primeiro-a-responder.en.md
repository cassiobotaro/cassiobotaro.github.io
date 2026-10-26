+++
title = "Go Concurrency - First to respond"
date = "2026-11-24"
publishDate = "2026-11-24"
description = "The same query to three replicas, and the first answer wins. See how much this cuts from tail latency, why the losers need to be cancelled, and what happens when all of them fail."
slug = "go-concurrency-first-to-respond"
tags = ["go", "concurrency", "goroutines", "channels", "context", "hedged-request", "latency"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/primeiro.mp4" titulo="A query sent to three replicas and the first answer winning" >}}

Three replicas of the same service, and the latency of each one varies on every call. If I query just one, every now and then I hit its bad moment.

What if I send the same query to all three and keep the first answer?

## What first to respond is

That's exactly it. The query goes to every replica, the first answer wins and the others get cancelled.

It's the technique Rob Pike uses in the Google search example, in the talk [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide), with a function called `First`. It also goes by _hedged request_.

```go
type result struct {
	answer string
	err    error
}

func first(ctx context.Context, query string, replicas ...func(context.Context, string) (string, error)) (string, error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// one slot per replica
	results := make(chan result, len(replicas))
	for _, r := range replicas {
		go func() {
			answer, err := r(ctx, query)
			results <- result{answer, err}
		}()
	}

	// a failure is an answer too, and needs to be counted
	var err error
	for range replicas {
		select {
		case r := <-results:
			if r.err == nil {
				return r.answer, nil
			}
			err = r.err
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	return "", err
}
```

Each replica is simulated with a random wait of up to 100 milliseconds, and gives up if the context is cancelled first:

```go
func replica(name string) func(context.Context, string) (string, error) {
	return func(ctx context.Context, query string) (string, error) {
		select {
		case <-time.After(rand.N(100 * time.Millisecond)):
			return fmt.Sprintf("%s answered %q", name, query), nil
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
}
```

```bash
$ go run .
replica 3 answered "golang"
$ go run .
replica 1 answered "golang"
```

The winner changes on every run.

Notice the `context.WithCancel` and the `defer cancel()`. The 2012 `First` only reads the first answer, and the losers keep working until the end just to throw the result away. Here, as soon as `first` returns, `cancel()` fires and the losers leave through `ctx.Done()`. A real replica would do the same with `http.NewRequestWithContext`.

## But how much do you gain?

I measured it here, 200 calls with one replica and 200 with three:

```bash
1 replica(s): mean 54ms, p50 53ms, p90 94ms, max 100ms
3 replica(s): mean 24ms, p50 20ms, p90 48ms, max 76ms
```

The mean dropped by half, and so did the p90. That's what reducing tail latency means. For the bad moment to get in the way, all three need to be in their bad moment at the same time.

The price is on the other side. It's three requests on the server for every query, and the cancellation only softens that, because the losers have already started.

## But why the slot per replica?

Look at `make(chan result, len(replicas))`. Even with the cancellation, a loser can finish in the gap between the winner arriving and the `cancel()`. It tries to send the result and nobody is going to read it anymore.

I removed the buffer and called `first` 100 times:

```bash
slots 0: goroutines alive after 100 calls: 201
slots 3: goroutines alive after 100 calls: 1
```

Whoa! Without the slot, the two losers of each call got stuck on the send. Two hundred goroutines left behind, and on a server that stays up for months this only grows.

## What if all of them fail?

Pay attention to the `for range replicas`. The loop waits for one answer per replica, and an error counts as an answer.

If I ignored the errors and waited only for a success, it would take just all the replicas failing for `first` to wait forever, because the `ctx.Done()` of a `context.Background()` never arrives. With the loop, the first answer without an error wins, and if all of them fail the last error is returned.

And you can combine it with a deadline. `main` asks with a `context.WithTimeout` of 20 milliseconds, and `first` passes the same context on to the replicas:

```bash
$ go run .
replica 3 answered "golang"
timed out: no replica answered within 20ms
```

The same `ctx.Done()` that ends the wait ends the replicas. It's what Pike calls, at the end of the talk, "_fast, replicated, robust_".

## Where the example comes from

The code is in the [`primeiro`](https://github.com/cassiobotaro/concorrencia-go/tree/main/primeiro) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test runs in `synctest` with fixed latencies, to know beforehand who wins, and covers the path where all of them fail. Heads up: the repository is written in Portuguese, so the function there is called `primeiro` and the result is `resultado`.

Keep in mind that the pattern only makes sense when the query can be repeated without side effects. Sending a `POST` that creates an order to three replicas creates three orders.

Next up is confirmed stop. Telling it to stop is easy, the hard part is knowing that the goroutine really stopped and released what it was using.

That's it, folks!

See you next time!

{}'s
