+++
title = "Go Concurrency - State-owning goroutine"
date = "2026-11-17"
publishDate = "2026-11-17"
description = "Three goroutines writing to the same map and the program dies. See how a single goroutine that owns the state serves everyone through channels, when a mutex does the job just as well, and the race the race detector doesn't catch."
slug = "go-concurrency-state-owning-goroutine"
tags = ["go", "concurrency", "goroutines", "channels", "mutex", "select", "race"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/dono_do_estado.mp4" titulo="A single goroutine guarding the map and serving requests through channels" >}}

Three goroutines and a counting map. Each one increments its key a thousand times:

```go
counts := make(map[string]int)
var wg sync.WaitGroup
for _, key := range []string{"gopher", "gopher", "marmot"} {
	wg.Go(func() {
		for range 1000 {
			counts[key]++
		}
	})
}
wg.Wait()
fmt.Println("gopher =", counts["gopher"], "marmot =", counts["marmot"])
```

I ran it 10 times here. In 8 of them:

```bash
fatal error: concurrent map writes
```

Of the other two, one gave `gopher = 1218` and only one got the 2000 right.

`counts[key]++` is read, add and write, and two goroutines in the middle of that trip over each other. Go notices and takes the program down, and when it doesn't notice, it loses increments silently.

## What the state-owning goroutine is

Back in the [hello world](/en/posts/go-concurrency-hello-world/) the proverb "_Don't communicate by sharing memory, share memory by communicating_" showed up. This pattern is that proverb taken literally.

Instead of several goroutines poking at the map, a single goroutine owns it. The others ask for increments and reads through channels, and it serves one request at a time.

It also goes by monitor or confinement. Actor is close, but in the actor model the message goes by name, and here it goes by channel.

```go
type query struct {
	key   string
	reply chan<- int
}

// only this goroutine touches the map
func counter(increment <-chan string, lookup <-chan query) {
	counts := make(map[string]int)
	for {
		select {
		case key, ok := <-increment:
			if !ok {
				return
			}
			counts[key]++
		case q := <-lookup:
			q.reply <- counts[q.key]
		}
	}
}
```

Notice that `counts` is a local variable of the goroutine. Nobody outside has any way to reach it, so there's no race because there aren't two owners.

The three goroutines from the opening now send the key through the channel instead of touching the map, and the read is the [request and response](/en/posts/go-concurrency-request-response/) from the last post, buffer slot and all:

```go
for _, key := range []string{"gopher", "gopher", "marmot"} {
	wg.Go(func() {
		for range 1000 {
			increment <- key
		}
	})
}
wg.Wait()

for _, key := range []string{"gopher", "marmot"} {
	reply := make(chan int, 1)
	lookup <- query{key: key, reply: reply}
	fmt.Printf("state owner: %s = %d\n", key, <-reply)
}
close(increment)
```

```bash
$ go run .
state owner: gopher = 2000
state owner: marmot = 1000
```

Pay attention to the `select`. It's the service queue, and since only it touches the map, there's no need for a `mutex`, a condition variable or a _callback_. That's how Sameer Ajmani sums up the technique in the talk [Advanced Go Concurrency Patterns](https://go.dev/talks/2013/advconc.slide).

## But what about the mutex?

Rob Pike has another proverb for this: "_Channels orchestrate; mutexes serialize_".

If all I need is for one increment not to trip over the other, a `sync.Mutex` does the job:

```go
type mutexCounter struct {
	mu     sync.Mutex
	counts map[string]int
}

func (c *mutexCounter) increment(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.counts[key]++
}
```

Same result, 2000 and 1000, and no extra goroutine or reply channel.

So when is the owning goroutine worth it? When there's a rule about how the state changes, when it needs to react to several channels at once, like the [sliding window](/en/posts/go-concurrency-sliding-window/) did with input and output in the same `select`, or when the state has a lifecycle of its own. If none of that applies, I think the `mutex` is the right answer.

## The race `-race` doesn't catch

The race detector catches the map from the opening. I ran it with `go run -race` and it points at the `counts[key]++` line with two `WARNING: DATA RACE`.

But there's a race it doesn't see. Picture a withdrawal done with the `mutex` version: it calls `lookup`, sees a balance of 50, and calls a debit of 40. Two goroutines do this at the same time, both see 50, both withdraw, and the balance ends up at minus 30.

Each call locked and unlocked the `mutex` just fine. There's no data race, there's a race condition, and it's the compound operation that was left unprotected.

With the state-owning goroutine this comes for free. "Withdraw if there's enough balance" becomes a single message, and the `select` serves one at a time.

## Where the example comes from

The code is in the [`dono_do_estado`](https://github.com/cassiobotaro/concorrencia-go/tree/main/dono_do_estado) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go), with the `mutex` version next to it. The test runs with `-race` turned on. Heads up: the repository is written in Portuguese, so the map there is called `contagem` and the channels are `incrementar` and `consultar`.

Next up is the barrier, where several goroutines stop at one point and none moves on until the last one arrives.

Keep in mind that if reads dominate, `sync.RWMutex` lets several `lookup` calls run together with `RLock`, and only `increment` locks everyone out.

That's it, folks!

See you next time!

{}'s
