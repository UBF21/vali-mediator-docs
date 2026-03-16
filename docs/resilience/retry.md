---
id: retry
title: Retry Policy
---

# Retry Policy

The retry policy automatically re-executes a failed operation up to a configured number of times.

## Basic Usage

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(3) // retry up to 3 times
    .Build();

string result = await policy.ExecuteAsync<string>(async ct =>
{
    return await _httpClient.GetStringAsync(url, ct);
});
```

## Configuration Options

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 3;
        opts.BackoffType = BackoffType.Exponential; // Constant, Linear, Exponential
        opts.DelayMs = 200;                          // base delay in ms
        opts.OnRetry = context =>
        {
            Console.WriteLine($"Retry #{context.AttemptNumber}: {context.Exception?.Message}");
            return Task.CompletedTask;
        };
    })
    .Build();
```

## Backoff Types

| BackoffType | Delay Formula | Example (DelayMs=200) |
|------------|--------------|----------------------|
| `Constant` | `DelayMs` always | 200ms, 200ms, 200ms |
| `Linear` | `DelayMs × attempt` | 200ms, 400ms, 600ms |
| `Exponential` | `DelayMs × 2^attempt` + jitter | ~200ms, ~400ms, ~800ms |

:::tip
Use `Exponential` for external services to avoid the "thundering herd" problem — many clients retrying at exactly the same moment after a service recovers.
:::

## Retry on Specific Exceptions

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 3;
        // Only retry on these exception types
        opts.RetryOnExceptions = new[]
        {
            typeof(HttpRequestException),
            typeof(TimeoutException)
        };
    })
    .Build();
```

## Retry on Result Failure Types

When using the `Result` pattern, retry only on specific `ErrorType` values:

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 2;
        // Retry if the Result fails with these error types
        opts.RetryOnErrorTypes = new[] { ErrorType.Failure };
        // Not on Validation, NotFound, etc.
    })
    .Build();
```

## OnRetry Callback

```csharp
.Retry(opts =>
{
    opts.MaxRetries = 3;
    opts.OnRetry = context =>
    {
        _logger.LogWarning(
            "Retry attempt {Attempt}/{Max}: {Error}",
            context.AttemptNumber,
            context.MaxAttempts,
            context.Exception?.Message ?? context.Result?.ToString());
        return Task.CompletedTask;
    };
})
```

## Full Example

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 4;
        opts.BackoffType = BackoffType.Exponential;
        opts.DelayMs = 100;
        opts.RetryOnExceptions = new[] { typeof(HttpRequestException) };
        opts.OnRetry = ctx =>
        {
            Console.WriteLine($"Attempt {ctx.AttemptNumber} failed, retrying...");
            return Task.CompletedTask;
        };
    })
    .Build();

Result<PaymentDto> result = await policy.ExecuteAsync<Result<PaymentDto>>(async ct =>
{
    return await _paymentClient.ProcessAsync(request, ct);
});
```
