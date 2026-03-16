---
id: timeout
title: Timeout Policy
---

# Timeout Policy (Resilience)

The resilience timeout policy cancels an operation if it takes longer than the configured duration. This is the resilience-level timeout, independent of the pipeline-level `IHasTimeout`.

## Basic Usage

```csharp
var policy = ResiliencePolicy.Create()
    .Timeout(TimeSpan.FromSeconds(5))
    .Build();

string result = await policy.ExecuteAsync<string>(async ct =>
{
    // ct will be cancelled after 5 seconds
    return await _httpClient.GetStringAsync(url, ct);
});
```

## Configuration Options

```csharp
var policy = ResiliencePolicy.Create()
    .Timeout(opts =>
    {
        opts.Timeout = TimeSpan.FromSeconds(10);
        opts.Strategy = TimeoutStrategy.Optimistic; // or Pessimistic
        opts.OnTimeout = context =>
        {
            _logger.LogWarning("Operation timed out after {Duration}", context.Timeout);
            return Task.CompletedTask;
        };
    })
    .Build();
```

## Timeout Strategies

### Optimistic (Default)

Relies on the operation **observing the CancellationToken**. The token is cancelled after the timeout, and the operation is expected to honour it.

```csharp
// Works well — HttpClient respects cancellation
await _httpClient.GetStringAsync(url, ct);

// Works well — EF Core respects cancellation
await _dbContext.Products.ToListAsync(ct);
```

:::note
Use **Optimistic** when your operations accept and honour `CancellationToken`. This is the preferred strategy.
:::

### Pessimistic

Forcibly terminates the operation by running it on a background thread and abandoning it when the timeout fires. Use this for operations that **do not** accept or honour `CancellationToken`.

```csharp
var policy = ResiliencePolicy.Create()
    .Timeout(opts =>
    {
        opts.Timeout = TimeSpan.FromSeconds(5);
        opts.Strategy = TimeoutStrategy.Pessimistic;
    })
    .Build();

// Even if the operation doesn't accept ct, it will be abandoned after 5s
await policy.ExecuteAsync<string>(_ =>
{
    return Task.FromResult(LegacySynchronousCall());
});
```

:::warning
With **Pessimistic** strategy, the abandoned operation continues running in the background even after timeout. This can cause resource leaks. Use with caution.
:::

## Combining with Retry

When combined with Retry, the timeout applies **per attempt** (not total):

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(3)
    .Timeout(TimeSpan.FromSeconds(5)) // 5s per attempt, not 15s total
    .Build();
```

## Difference from IHasTimeout

| Feature | `IHasTimeout` | Resilience Timeout |
|---------|--------------|-------------------|
| Where | Pipeline behavior | Resilience policy |
| Configuration | On the request class | On the policy builder |
| Applies to | All requests of that type | Any `ExecuteAsync` call |
| Exception | `TimeoutException` | `TimeoutException` |
| Use case | Declarative per-request | Dynamic/programmatic |
