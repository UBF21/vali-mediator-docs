---
id: overview
title: Resilience Overview
---

import Drawio from '@theme/Drawio';
import resilienceOverview from '@site/static/diagrams/resilience-overview.drawio';

# Resilience

`Vali-Mediator.Resilience` provides a fluent, composable resilience pipeline with zero external dependencies.

## Installation

```bash
dotnet add package Vali-Mediator.Resilience
```

## Execution Order

When multiple policies are combined, they execute in this fixed order (outermost → innermost):

<Drawio content={resilienceOverview} />

**Fallback** is always the outermost — it catches failures from all inner policies.
**Hedge** is innermost — it runs the actual operation (potentially in parallel).

## Creating a Policy

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(3)
    .CircuitBreaker(opts =>
    {
        opts.FailureThreshold = 5;
        opts.BreakDuration = TimeSpan.FromSeconds(30);
    })
    .Timeout(TimeSpan.FromSeconds(10))
    .Build();

// Execute
string result = await policy.ExecuteAsync<string>(async ct =>
{
    return await _httpClient.GetStringAsync(url, ct);
});
```

## Resilience Presets

Pre-configured policies for common scenarios:

```csharp
// For external API calls (Retry + CircuitBreaker + Timeout)
var policy = ResiliencePresets.ForExternalApi();

// For database operations (Retry with shorter timeout)
var policy = ResiliencePresets.ForDatabase();

// For critical operations (Retry + CircuitBreaker + Fallback)
var policy = ResiliencePresets.ForCritical(fallbackValue: "default");

// No resilience (passthrough)
var policy = ResiliencePresets.NoResilience();
```

## Available Policies

| Policy | Method | Purpose |
|--------|--------|---------|
| Retry | `.Retry(n)` | Retry on transient failures |
| Circuit Breaker | `.CircuitBreaker(opts)` | Stop calls when failure rate is high |
| Timeout | `.Timeout(ts)` | Cancel slow operations |
| Bulkhead | `.Bulkhead(n, q)` | Limit concurrent requests |
| Hedge | `.Hedge(delay)` | Parallel speculative requests |
| Rate Limiter | `.RateLimiter(cap)` | Throttle request rate |
| Chaos | `.Chaos(rate)` | Inject faults for testing |
| Fallback | `.Fallback<T>(opts)` | Return a default when all else fails |

## Void Operations

All policies support void (no return value) operations:

```csharp
await policy.ExecuteAsync(async ct =>
{
    await _repository.SaveAsync(entity, ct);
});
```

## Named Policies (Shared Circuit Breaker State)

Use a key to share state across multiple policy instances:

```csharp
var policy = ResiliencePolicy.Create("payment-service")
    .CircuitBreaker(opts =>
    {
        opts.CircuitKey = "payment-circuit"; // shared state key
        opts.FailureThreshold = 5;
    })
    .Build();
```
