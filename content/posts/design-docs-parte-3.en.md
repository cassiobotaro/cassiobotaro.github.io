+++
title = "Design docs, part 3: alternatives, cross-cutting concerns, and more"
date = "2026-06-15"
publishDate = "2026-06-15"
description = "How to record the alternatives you ruled out, what might affect other teams, and the closing sections: testability, rollout plan, and open questions."
slug = "design-docs-part-3"
tags = ["design-docs", "architecture", "documentation"]
categories = ["software-engineering"]
series = ["design-docs"]
+++

![Design docs (part 3)](/images/design-docs-3.png "Design docs")

In [part 2](/en/posts/design-docs-part-2/) we described and justified the design of the solution. But a good document also shows the paths you **didn't** take and what your solution affects beyond your own team.

> ⚠️ A quick reminder: the sections that follow are examples and recommendations, not a mandatory template.

## Alternatives considered

Here you list the alternative systems or solutions you evaluated, explaining the trade-offs and the reasoning behind the final choice.

> **Alternatives considered**
>
> **Do nothing.** Keep the manual process with spreadsheets. Ruled out, because it doesn't solve the recurring stockouts and doesn't scale as the catalog grows.
>
> **Heuristic rules (reorder-point replenishment).** Simple to implement, but it doesn't capture seasonality or promotional events. Estimated MAPE around 35%, above the acceptable threshold.
>
> **✓ Batch predictive model (chosen).** Balances cost, accuracy, and delivery timeline. Expected MAPE ≤ 15%, reusing the existing infrastructure.

💡 **Tips:**

- One alternative that's always worth considering is **doing nothing**. Document why you ruled it out.
- The focus should be on the trade-offs of each option and how they led to the chosen solution.
- Be concise, but make it clear why the chosen solution is the best one given the project's constraints.

## Cross-cutting concerns

Describe what might **affect people** beyond your team: security, API compatibility, increased load on other systems, infrastructure. This ties directly into collaborating with the teams involved in or impacted by the solution.

> **Cross-cutting concerns**
>
> **Security.** Per-store sales data is sensitive. Access to the feature table is restricted by IAM to the ML Engineers group. The dashboard uses row-level security by region.
>
> **Infrastructure.** The inference job increases BigQuery slot consumption by roughly 15% while it runs (4 AM to 6 AM). Aligned with the Platform team.
>
> **Compatibility.** The recommendations table follows the schema agreed with the Analytics team. Future schema changes require versioning and advance communication.

💡 **Tips:**

- Get the teams involved as early as possible. Late surprises lead to rework and delays.
- Ask the impacted teams for reviews. They spot problems your team can't see.

## Other (wrapping up)

A few short sections tend to round out the document nicely.

**Testability and observability.** How the solution will be tested and how metrics will confirm success, including how it will be observed in production.

> Tests: backtesting over the last 6 months and integration tests through Airflow's CI. Metrics: MAPE ≤ 15% and a stockout reduction of ≥ 20% within 90 days. Observability: Datadog alerts for pipeline failures and latency above 2h.

**Rollout plan.** How the deliverables are broken down and the steps to deliver value incrementally and safely.

> 1. Pipeline and feature table in production (weeks 1 and 2).
> 2. Model training and validation (weeks 3 and 4).
> 3. Pilot with 5 stores (weeks 5 and 6).
> 4. Full rollout (week 7).

**Open questions.** Points that are still undefined or unknown. They signal honesty and invite collaboration.

> - How should we handle products with less than 30 days of history?
> - What's an acceptable SLA for a delay in the pipeline? Waiting on alignment with Operations.
> - Should the model support multiple horizons (7, 14, and 30 days) in this version?

## Until next time

With that, the content of the document is complete. In **part 4** we move away from "what to write" and look at the process: the life cycle of a design doc, when it's *not* worth writing one, and other types of document that live alongside it.

So that's it, folks!

See you next time!

{}'s
