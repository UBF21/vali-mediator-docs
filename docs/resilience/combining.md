---
id: combining
title: Combining Policies
---

# Combining Policies

Policies compose naturally in the resilience pipeline. Understanding the execution order is key to building effective combinations.

## Fixed Execution Order

Regardless of the order you add them with the builder, policies always execute in this order:

```
Fallback → Chaos → RateLimiter → Retry → Timeout → CircuitBreaker → Bulkhead → Hedge → Handler
```

This means:
- **Fallback** sees all failures from all other policies
- **Chaos** and **RateLimiter** are evaluated once per logical call, not retried — a rate-limit rejection no longer gets retried or counted against the circuit breaker
- **Retry** fires after RateLimiter lets the call through, and wraps everything inside it (CircuitBreaker, Bulkhead, Hedge)
- **Timeout** applies per attempt (inside Retry)
- **CircuitBreaker** sits between Timeout and Bulkhead — an open circuit short-circuits before a bulkhead slot is taken
- **Hedge** runs the actual operation, potentially in parallel, as the innermost policy

## Common Combinations

### External API (Read)

```csharp
var policy = ResiliencePolicy.Create()
    .Fallback<ApiResponse>(opts =>
    {
        opts.FallbackValue = ApiResponse.Empty;
    })
    .Retry(opts =>
    {
        opts.MaxRetries = 3;
        opts.BackoffType = BackoffType.Exponential;
        opts.DelayMs = 200;
    })
    .CircuitBreaker(opts =>
    {
        opts.CircuitKey = "external-api";
        opts.FailureThreshold = 10;
        opts.BreakDuration = TimeSpan.FromSeconds(60);
    })
    .Timeout(TimeSpan.FromSeconds(10))
    .Build();
```

### Database Write

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 2;
        opts.BackoffType = BackoffType.Linear;
        opts.DelayMs = 100;
        // Only retry on transient DB errors
        opts.RetryOnExceptions = new[] { typeof(SqlException) };
    })
    .Timeout(TimeSpan.FromSeconds(30))
    .Build();
```

### Low-Latency Read with Hedge

```csharp
var policy = ResiliencePolicy.Create()
    .Fallback<string>(opts => { opts.FallbackValue = string.Empty; })
    .Timeout(TimeSpan.FromSeconds(2))
    .Hedge(opts =>
    {
        opts.HedgeDelay = TimeSpan.FromMilliseconds(100); // P95 latency
        opts.MaxHedgedAttempts = 1;
    })
    .Build();
```

### Full Protection

```csharp
var policy = ResiliencePolicy.Create()
    .Fallback<Result<OrderDto>>(opts =>
    {
        opts.FallbackValue = Result<OrderDto>.Fail(
            "Service temporarily unavailable.", ErrorType.Failure);
    })
    .RateLimiter(opts =>
    {
        opts.Algorithm = RateLimiterAlgorithm.TokenBucket;
        opts.BucketCapacity = 100;
        opts.TokensPerInterval = 10;
        opts.ReplenishmentInterval = TimeSpan.FromSeconds(1);
    })
    .Retry(opts =>
    {
        opts.MaxRetries = 3;
        opts.BackoffType = BackoffType.Exponential;
    })
    .CircuitBreaker(opts =>
    {
        opts.CircuitKey = "order-service";
        opts.FailureThreshold = 5;
        opts.BreakDuration = TimeSpan.FromSeconds(30);
    })
    .Timeout(TimeSpan.FromSeconds(5))
    .Build();
```

## ResiliencePresets

Use built-in presets for common scenarios:

```csharp
// For external API calls
var policy = ResiliencePresets.ForExternalApi();

// For database access
var policy = ResiliencePresets.ForDatabase();

// For critical paths with fallback
var policy = ResiliencePresets.ForCritical(fallbackValue: Result<string>.Fail("Unavailable", ErrorType.Failure));
```

## Tips

:::tip Design Principles
1. **Always add Fallback** when the caller cannot handle exceptions
2. **Retry wraps CircuitBreaker** (enforced by execution order) — each retry attempt passes through the circuit breaker, so an open circuit still short-circuits individual attempts instead of letting them all fail slowly
3. **Timeout applies per retry attempt** — a 5s timeout with 3 retries = up to 15s total + backoff
4. **Hedge reduces P99 latency** — not error recovery. Use Retry for errors, Hedge for latency.
5. **Use CircuitKey** to share circuit state across multiple operations targeting the same service
:::
