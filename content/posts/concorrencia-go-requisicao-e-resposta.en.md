+++
title = "Go Concurrency - Request and response"
date = "2026-11-11"
publishDate = "2026-11-11"
description = "A channel is a value, so a message can carry the channel it wants the answer on. See how a goroutine becomes a service, and why one buffer slot in the reply channel separates a service that keeps going from one that freezes."
slug = "go-concurrency-request-response"
tags = ["go", "concurrency", "goroutines", "channels", "request-response", "buffer"]
categories = ["go"]
series = ["go-concurrency"]
+++

{{< video src="/videos/requisicao_resposta.mp4" titulo="Each request carries the channel the response comes back on" >}}

So far in the series the data only moved in one direction. A generator writes, a worker reads, a stage passes it along.

But what about when I send a request and want the answer back? I need one channel going and another coming back. And what if the return one were inside the request?

## What request and response is

Channels are values like any other in Go. You can store them in a variable, pass them as a parameter and put them inside a `struct`.

So whoever asks includes in the message the channel it wants the answer on, and keeps reading from it. Whoever serves processes the request and replies on the channel that came in the message.

It also goes by reply channel or internal _RPC_.

```go
type request struct {
	value int
	reply chan<- int
}

// serves one request at a time and replies on the channel that came with it
func service(in <-chan request) {
	for req := range in {
		req.reply <- req.value * 2
	}
}

func main() {
	in := make(chan request)
	done := make(chan struct{})
	go func() {
		service(in)
		close(done)
	}()

	for i := range 5 {
		// a new channel per request
		reply := make(chan int, 1)
		in <- request{value: i, reply: reply}
		// stays stopped until the service replies
		fmt.Println("reply:", <-reply)
	}

	close(in)
	<-done
}
```

```bash
$ go run .
reply: 0
reply: 2
reply: 4
reply: 6
reply: 8
```

Notice the `chan<- int` on the `reply` field. The service only writes to it, and the compiler prevents it from reading its own reply by mistake.

Also pay attention to the `make` inside the loop. Each request carries its own channel, and that's what tells the service where to drop off the answer, like an envelope with the sender's address. No variable is shared, request and reply travel through channels.

## But why the slot in the reply channel?

`make(chan int, 1)` has one _buffer_ slot. In the example it's never used, because `main` always reads the reply. It's tempting to remove it.

I removed it. And to make it look like a real service, I made the first request take 200 milliseconds and the caller give up after 100, with a `select` and a `time.After`:

```bash
$ go run .
gave up waiting for request 0
fatal error: all goroutines are asleep - deadlock!
```

Whoa! The caller gave up, went on to send the second request and the program died.

The service finished processing the first one, tried to reply, and nobody was reading the channel. Since it has no slot, the service got stuck on the send, and the second request was never served.

With the slot back:

```bash
$ go run . slot
gave up waiting for request 0
service: replied 0
service: replied 2
reply: 2
service: replied 4
reply: 4
end
```

The service drops reply 0 into the slot, moves on, and the other two get served. The reply nobody read goes away along with the channel, when the garbage collector comes by.

So the slot isn't an optimization. It's what keeps one caller giving up from freezing the service for everyone.

## Restoring sequencing

In the talk [Go Concurrency Patterns](https://go.dev/talks/2012/concurrency.slide) Rob Pike uses the same idea for something else. In the [fan-in](/en/posts/go-concurrency-fan-in/) the values from the inputs arrive mixed up, and he wants to control the pace.

Each message carries a `wait` channel, and the producer only sends the next one after the reader signals, through that channel, that it finished processing the previous one. He calls it _restoring sequencing_, and it's request and response with the roles swapped: the reply is just a "go ahead".

## Where the example comes from

The code is in the [`requisicao_resposta`](https://github.com/cassiobotaro/concorrencia-go/tree/main/requisicao_resposta) folder of [concorrencia-go](https://github.com/cassiobotaro/concorrencia-go). The test there runs the whole `main` and checks the five replies. Heads up: the repository is written in Portuguese, so the service there is called `servico`, the reply channel is `resposta` and the slot mode is `go run . vaga`.

Next up is the state-owning goroutine. It's this pattern with a map inside the service, serving reads and writes through channels, and the _mutex_ version alongside for comparison.

One channel per request is cheap, but if the caller can give up, each of them needs the slot. Without it, a single caller giving up is enough to stop the service.

That's it, folks!

See you next time!

{}'s
