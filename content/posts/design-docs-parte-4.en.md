+++
title = "Design docs, part 4: lifecycle, when not to write one, and other documents"
date = "2026-06-22"
publishDate = "2026-06-22"
description = "A design doc is living documentation, and it has a lifecycle. Here's that lifecycle, the situations where writing one isn't worth it, and the other documents that live alongside it (ADR, RFC, tutorial)."
slug = "design-docs-part-4"
tags = ["design-docs", "architecture", "documentation"]
categories = ["software-engineering"]
series = ["design-docs"]
+++

![Design docs (part 4)](/images/design-docs-4.png "Design docs")

In the previous parts we filled the document out from top to bottom. Now the focus shifts: how a design doc lives over time, when *not* to write one, and which other documents travel alongside it.

## The lifecycle

A design doc is **living documentation**. It isn't born complete, and it doesn't die once the code ships. The typical path looks like this:

![Lifecycle of a design doc](/images/design-docs-ciclo-de-vida.png "Design doc lifecycle")

1. Write a document, on your own or with co-authors.
2. Share it with the colleagues who understand the problem best, and gather their criticism and suggestions to make it better.
3. Share it with a wider audience and, again, collect criticism and suggestions.
4. Once you're confident, start the implementation.
5. Keep the document alive by adding the maintenance work and the lessons you learn along the way.

Notice that review shows up more than once before a single line of code gets written. That's on purpose: it's far cheaper to fix a decision on paper than after it's been built.

## When not to write one

Writing a design doc has a cost. In some situations it creates more noise than value:

🚫 **The organizational culture is dysfunctional.** There's little point in writing documents that just say "this is how we're going to build it," with no alternatives, no trade-offs, and no explanations.

🚫 **The process overhead is a problem.** Writing takes extra effort, and if the organization doesn't see the benefit, the process ends up weighing you down more than it helps.

🚫 **There isn't enough complexity.** When the task is simpler than the effort of writing the document, the doc doesn't pay for itself.

## Other documents

The design doc isn't the only format out there. It's worth getting to know the neighbors:

- **ADR (Architecture Decision Record).** Captures an important architecture decision together with its context and consequences. See [architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) and [adr-tools](https://github.com/npryce/adr-tools).
- **RFC (Request for Comments).** Technical documents created by individuals and organizations to propose and discuss standards and processes, the way the IETF does. See [this introduction](https://eltonminetto.dev/post/2021-05-15-rfc/) and [the IETF process](https://www.ietf.org/process/rfcs/).
- **Tutorial.** Guided learning material, built on introductory information about a subject and taught by someone who knows it well. A great example is [FastAPI do Zero](https://fastapidozero.dunossauro.com/).

While the design doc is about *designing a solution* before you build it, the ADR records *a single decision*, the RFC *proposes and discusses* a standard, and the tutorial *teaches*. They complement each other.

## Until next time

We've wrapped up both the content and the process. In **part 5**, the last one, I'll bring together the tools for writing and diagramming, the references for going deeper, and a demo of how to generate a design doc with the help of an AI agent.

So that's it, folks!

Until next time!

{}'s
