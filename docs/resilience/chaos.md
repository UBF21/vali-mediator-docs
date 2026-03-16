---
id: chaos
title: Chaos Engineering Policy
---

# Chaos Engineering

The chaos policy injects faults (exceptions, latency, or synthetic results) into your execution pipeline. Use it in testing to validate that your resilience policies and error handling work correctly under adverse conditions.

## Fault Types (by Priority)

1. **Exception injection** — throws a specified exception
2. **Latency injection** — adds artificial delay (then executes normally)
3. **Synthetic result** — returns a fake value without executing the operation

## Basic Usage

```csharp
// 30% chance of injecting a fault
var policy = ResiliencePolicy.Create()
    .Chaos(0.3, opts =>
    {
        opts.ExceptionFactory = () => new HttpRequestException("Injected failure");
    })
    .Build();
```

## Injection Rate

`InjectionRate` is a `double` between `0.0` and `1.0`:

| Rate | Meaning |
|------|---------|
| `0.0` | Never inject (passthrough) |
| `0.3` | 30% chance per call |
| `1.0` | Always inject |

## Exception Injection

```csharp
.Chaos(0.2, opts =>
{
    opts.ExceptionFactory = () => new TimeoutException("Simulated timeout");
})
```

## Latency Injection

```csharp
// Always inject 500ms of latency, then execute normally
.Chaos(1.0, opts =>
{
    opts.LatencyInjection = TimeSpan.FromMilliseconds(500);
})
```

## Synthetic Result

```csharp
// 50% chance of returning a cached/degraded result without calling the real service
.Chaos(0.5, opts =>
{
    opts.ResultFactory = requestType => "synthetic-cached-response";
})
```

## Priority Behavior

When multiple fault types are configured, they apply in priority order:

```csharp
.Chaos(opts =>
{
    opts.InjectionRate = 1.0;
    opts.ExceptionFactory = () => new Exception("highest priority");
    opts.LatencyInjection = TimeSpan.FromSeconds(10); // won't apply — exception wins
    opts.ResultFactory = _ => "synthetic";             // won't apply either
})
```

## OnChaosInjected Callback

```csharp
.Chaos(0.3, opts =>
{
    opts.ExceptionFactory = () => new Exception("chaos");
    opts.OnChaosInjected = () =>
    {
        _metrics.IncrementChaosInjections();
        return Task.CompletedTask;
    };
})
```

## Deterministic Testing

Use a custom `Random` for reproducible test scenarios:

```csharp
// Always fires (0.0 < 0.5)
var alwaysFire = new FixedRandom(0.0);

// Never fires (0.99 >= 0.5)
var neverFire = new FixedRandom(0.99);

var policy = ResiliencePolicy.Create()
    .Chaos(opts =>
    {
        opts.InjectionRate = 0.5;
        opts.Random = alwaysFire; // deterministic for tests
        opts.ExceptionFactory = () => new Exception("deterministic chaos");
    })
    .Build();

private sealed class FixedRandom : Random
{
    private readonly double _value;
    public FixedRandom(double value) : base(0) => _value = value;
    public override double NextDouble() => _value;
}
```

## Testing Strategy

```csharp
// Unit test: verify your handler recovers from transient errors
[Fact]
public async Task Handler_RetryPolicy_RecoversFromTransientFailure()
{
    var chaosPolicy = ResiliencePolicy.Create()
        .Chaos(opts =>
        {
            opts.InjectionRate = 0.5;
            opts.Random = new FixedRandom(0.0); // always fires
            opts.ExceptionFactory = () => new HttpRequestException("Simulated");
        })
        .Build();

    var retryPolicy = ResiliencePolicy.Create()
        .Retry(3)
        .Build();

    // Combine: retry wraps chaos
    int attempts = 0;
    var result = await retryPolicy.ExecuteAsync<string>(async ct =>
    {
        attempts++;
        return await chaosPolicy.ExecuteAsync<string>(async ct2 =>
            await _realService.CallAsync(ct2), ct);
    });

    Assert.True(attempts > 1);
}
```

:::warning
Never use the chaos policy in production without a feature flag or environment check. Wrap it in a conditional:
```csharp
if (_env.IsProduction())
    policy = policy.WithoutChaos(); // or simply don't add .Chaos()
```
:::
