---
id: fallback
title: Fallback Policy
---

# Fallback Policy

The fallback policy provides a **last resort** value when all other policies in the pipeline have been exhausted. It is always the outermost policy, catching failures from all inner policies.

## Basic Usage

```csharp
var policy = ResiliencePolicy.Create()
    .Fallback<string>(opts =>
    {
        opts.FallbackValue = "default-response";
    })
    .Retry(3)
    .Timeout(TimeSpan.FromSeconds(5))
    .Build();
```

## Static Fallback Value

```csharp
.Fallback<string>(opts =>
{
    opts.FallbackValue = "Service temporarily unavailable.";
})
```

## Dynamic Fallback Factory

Use `FallbackFactory` to compute the fallback based on context:

```csharp
.Fallback<ProductDto>(opts =>
{
    opts.FallbackFactory = context =>
    {
        // context.Exception — the exception that caused the fallback
        // context.AttemptNumber — how many attempts were made
        _logger.LogWarning(
            "Falling back after {Attempts} attempts: {Error}",
            context.AttemptNumber,
            context.Exception?.Message);

        return new ProductDto { Name = "Unknown", Price = 0 };
    };
})
```

## OnFallback Callback

```csharp
.Fallback<string>(opts =>
{
    opts.FallbackValue = "cached-default";
    opts.OnFallback = context =>
    {
        _metrics.IncrementFallbackCount();
        _logger.LogWarning("Fallback triggered: {Error}", context.Exception?.Message);
        return Task.CompletedTask;
    };
})
```

## Common Patterns

### Cache Fallback

```csharp
.Fallback<ProductList>(opts =>
{
    opts.FallbackFactory = _ =>
    {
        // Return last known good value from cache
        return _cache.GetLastKnownGoodProductList()
               ?? new ProductList();
    };
    opts.OnFallback = ctx =>
    {
        _logger.LogWarning("Product service unavailable, using cached data");
        return Task.CompletedTask;
    };
})
```

### Degraded Mode Response

```csharp
.Fallback<UserPreferencesDto>(opts =>
{
    // Return sensible defaults when preferences service is down
    opts.FallbackValue = UserPreferencesDto.Default;
})
```

### Circuit Breaker + Fallback

```csharp
var policy = ResiliencePolicy.Create()
    .Fallback<string>(opts =>
    {
        opts.FallbackValue = "Service unavailable";
        opts.OnFallback = ctx =>
        {
            _logger.LogWarning("Fallback after circuit opened");
            return Task.CompletedTask;
        };
    })
    .Retry(3)
    .CircuitBreaker(opts =>
    {
        opts.FailureThreshold = 5;
        opts.BreakDuration = TimeSpan.FromSeconds(30);
    })
    .Timeout(TimeSpan.FromSeconds(5))
    .Build();
```

:::tip
The fallback policy is type-specific (`Fallback<T>`). Make sure the fallback value type matches the return type of your `ExecuteAsync<T>` call.
:::
