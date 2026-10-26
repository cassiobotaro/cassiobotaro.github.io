+++
title = "Go Concurrency - Ticket system"
date = "2026-11-03"
publishDate = "2026-11-03"
description = "Ten calls per second, and not a single one more. See how a ticket booth sets the pace of a worker, why a Ticker hands out two tickets at once, and what this version leaves out."
slug = "go-concurrency-ticket-system"
tags = ["go", "concurrency", "goroutines", "channels", "rate-limiting", "timer"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/ticket.mp4" titulo="A ticket booth issuing tickets at a fixed pace to a worker" >}}

In the [semaphore](/en/posts/go-concurrency-semaphore/) the limit was three tasks at the same time.

But some APIs don't care how many calls are open, they care how many you make per second. Go past ten, get a `429` and sit in time-out.

Here the limit isn't about occupancy, it's about pace.

## What a ticket system is

A ticket system controls when a job is allowed to start. A goroutine plays the ticket booth and issues tickets at a fixed rate, and the worker only runs after grabbing one.

It also goes by _rate limiting_ or _throttling_, but those names are approximate. I'll get back to that.

The worker gets two channels, one for jobs and one for tickets:

```go
type ticket int

func worker(tickets <-chan ticket, jobs <-chan func()) {
	for {
		// reads the job first, so it doesn't waste a ticket for nothing
		job, ok := <-jobs
		if !ok {
			return
		}
		<-tickets // waits for permission before running
		job()
	}
}
```

Notice the order. If the jobs channel closed, the worker shuts down without grabbing a ticket nobody is going to use.

And the booth issues a ticket every `window/nTickets`:

```go
func ticketBooth(ctx context.Context, tickets chan<- ticket, window time.Duration, nTickets int) {
	interval := window / time.Duration(nTickets)
	pause := time.NewTimer(interval)
	defer pause.Stop()

	for i := 0; ; i++ {
		select {
		case tickets <- ticket(i):
		case <-ctx.Done():
			return
		}
		// the interval counts from the delivery
		pause.Reset(interval)
		select {
		case <-pause.C:
		case <-ctx.Done():
			return
		}
	}
}
```

`main` asks for ten tickets per second and sends 31 jobs:

```go
go ticketBooth(ctx, tickets, 1*time.Second, 10)
go func() {
	worker(tickets, jobs)
	close(done)
}()

for i := 0; i <= 30; i++ {
	jobs <- func() {
		fmt.Println("processing ticket")
	}
}
close(jobs)
<-done
```

I ran it here and the 31 jobs took 3.25 seconds. Ten per second, as requested.

## But why not a `Ticker`?

You could write the booth with a `time.Ticker`, which already fires on its own every interval. Wait for the tick and hand out the ticket. Looks like the right tool, right?

I wrote that version to compare.

I left the worker sleeping 250 milliseconds before grabbing the first ticket, and noted when each one arrived:

```bash
$ go run . ticker
ticket 0 at  250ms (interval since the previous one:   0ms)
ticket 1 at  251ms (interval since the previous one:   1ms)
ticket 2 at  300ms (interval since the previous one:  49ms)
ticket 3 at  400ms (interval since the previous one: 100ms)
```

Whoa! Ticket 1 came out 1 millisecond after ticket 0.

The `Ticker` kept ticking while the booth was stuck on the send, and it keeps one tick in the channel. When the worker finally grabbed ticket 0, the next iteration of the loop found the tick already waiting, and ticket 1 came out right away. Two at once, and there goes the limit.

With the `Timer`, the `Reset` happens after the delivery, in other words, the interval counts from the moment the worker grabbed the ticket:

```bash
$ go run . timer
ticket 0 at  250ms (interval since the previous one:   0ms)
ticket 1 at  351ms (interval since the previous one: 100ms)
ticket 2 at  451ms (interval since the previous one: 100ms)
ticket 3 at  551ms (interval since the previous one: 100ms)
```

So no matter how slow the worker is, two tickets never come out together.

## But what about bursts?

This is where the name _rate limiting_ gets approximate.

This booth never lets two out together, so it doesn't allow bursts either. If the worker went ten seconds without asking for anything, it didn't earn a hundred saved-up tickets. It earned one.

A real limiter, the _token bucket_, starts with a balance of `n` tokens and refills one every `window/n`. You can spend all `n` at once and then wait. If your API tolerates bursts, the `golang.org/x/time/rate` package does that and it isn't worth reinventing.

## Where the example comes from

The code is in the [`ticket`](https://github.com/cassiobotaro/concorrencia-go/tree/main/ticket) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test there runs in `synctest` with five tickets every 50 milliseconds, and three jobs take exactly 20 milliseconds, because inside the fake clock bubble time only moves when everyone is waiting. Heads up: the repository is written in Portuguese, so the booth there is called `bilheteria` and the worker is `trabalhador`.

Next up is batch processing, which gathers values arriving one by one to process them all at once.

Remember that calling `Reset` without draining `pause.C` is only correct since Go 1.23, and with `go.mod` declaring `go 1.23` or newer. Before that a stale tick stayed in the channel and the next ticket came out right away, the same problem as the `Ticker`.

That's it, folks!

See you next time!

{}'s
