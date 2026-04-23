---
id: hedge
title: Hedge Policy
---

import Drawio from '@theme/Drawio';
import hedgePolicy from '@site/static/diagrams/hedge-policy.drawio';

# Hedge Policy

The hedge policy starts a **parallel speculative request** if the original doesn't complete within a delay. Whichever completes first wins; the others are cancelled.

Use hedging to reduce tail latency — the P99 response time — for latency-sensitive operations.

## Basic Usage

```csharp
var policy = ResiliencePolicy.Create()
    .Hedge(TimeSpan.FromMilliseconds(100)) // start hedge if original takes > 100ms
    .Build();
```

## Configuration Options

```csharp
var policy = ResiliencePolicy.Create()
    .Hedge(opts =>
    {
        opts.HedgeDelay = TimeSpan.FromMilliseconds(100);
        opts.MaxHedgedAttempts = 2; // up to 2 additional parallel attempts

        opts.OnHedge = context =>
        {
            _logger.LogDebug("Hedge attempt #{Attempt} started", context.AttemptNumber);
            return Task.CompletedTask;
        };
    })
    .Build();
```

## How It Works

<Drawio content={hedgePolicy} />

## Hedge on Result Predicate

Start a hedge not just on timeout, but when the result is "bad":

```csharp
var policy = ResiliencePolicy.Create()
    .Hedge(opts =>
    {
        opts.HedgeDelay = TimeSpan.FromMilliseconds(50);
        opts.MaxHedgedAttempts = 1;

        // Hedge if result indicates degraded response
        opts.ShouldHedgeOnResult = result =>
            result is string s && s.Contains("degraded");
    })
    .Build();
```

## Exception Handling

By default, exceptions from hedged attempts are **suppressed** — if all attempts fail, the executor returns `default` (null for reference types):

```csharp
// Default behavior: exceptions suppressed, returns null on all failures
string? result = await policy.ExecuteAsync<string>(ct =>
    throw new HttpRequestException("Network error"));
// result == null
```

### ShouldHedgeOnException

Control whether an exception triggers another hedge attempt:

```csharp
.Hedge(opts =>
{
    opts.HedgeDelay = TimeSpan.FromMilliseconds(50);

    // true (default) = treat exception as "try next hedge"
    // false = treat exception as "done, stop hedging" (also returns default)
    opts.ShouldHedgeOnException = ex => ex is HttpRequestException;
})
```

:::note
The hedge policy is optimized for **latency reduction**, not for error recovery. For error recovery, use Retry instead. Combine Retry + Hedge when you need both.
:::

## Full Example: Low-Latency Search

```csharp
// Search endpoint: hedge against slow replica reads
var searchPolicy = ResiliencePolicy.Create()
    .Hedge(opts =>
    {
        opts.HedgeDelay = TimeSpan.FromMilliseconds(200); // P95 latency
        opts.MaxHedgedAttempts = 1;
        opts.OnHedge = ctx =>
        {
            _metrics.IncrementHedgeCount("search");
            return Task.CompletedTask;
        };
    })
    .Timeout(TimeSpan.FromSeconds(2))
    .Build();

SearchResult result = await searchPolicy.ExecuteAsync<SearchResult>(async ct =>
    await _searchService.QueryAsync(query, ct));
```
