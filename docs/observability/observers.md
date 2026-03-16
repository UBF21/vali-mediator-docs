---
id: observers
title: Request Observers
---

# Request Observers

`IRequestObserver` hooks into the request lifecycle — started, completed, and failed — without modifying handler code.

## Interface

```csharp
public interface IRequestObserver
{
    Task OnStarted(ObservabilityContext context, CancellationToken ct);
    Task OnCompleted(ObservabilityContext context, CancellationToken ct);
    Task OnFailed(ObservabilityContext context, CancellationToken ct);
}

public class ObservabilityContext
{
    public string RequestName { get; }
    public string OperationId { get; }   // Guid.NewGuid().ToString()
    public TimeSpan Duration { get; }
    public bool IsSuccess { get; }
    public Exception? Exception { get; }
    public Dictionary<string, object?> Tags { get; }
}
```

## Implementing an Observer

### Logging Observer

```csharp
public class LoggingObserver : IRequestObserver
{
    private readonly ILogger<LoggingObserver> _logger;

    public LoggingObserver(ILogger<LoggingObserver> logger)
    {
        _logger = logger;
    }

    public Task OnStarted(ObservabilityContext context, CancellationToken ct)
    {
        _logger.LogDebug("Starting {Request} [{OperationId}]",
            context.RequestName, context.OperationId);
        return Task.CompletedTask;
    }

    public Task OnCompleted(ObservabilityContext context, CancellationToken ct)
    {
        _logger.LogInformation(
            "Completed {Request} in {Duration}ms [{OperationId}]",
            context.RequestName,
            context.Duration.TotalMilliseconds,
            context.OperationId);
        return Task.CompletedTask;
    }

    public Task OnFailed(ObservabilityContext context, CancellationToken ct)
    {
        _logger.LogError(context.Exception,
            "Failed {Request} after {Duration}ms [{OperationId}]",
            context.RequestName,
            context.Duration.TotalMilliseconds,
            context.OperationId);
        return Task.CompletedTask;
    }
}
```

### Alerting Observer

```csharp
public class SlowRequestAlertObserver : IRequestObserver
{
    private static readonly TimeSpan SlowThreshold = TimeSpan.FromSeconds(2);
    private readonly IAlertService _alerts;

    public SlowRequestAlertObserver(IAlertService alerts)
    {
        _alerts = alerts;
    }

    public Task OnStarted(ObservabilityContext context, CancellationToken ct) => Task.CompletedTask;

    public async Task OnCompleted(ObservabilityContext context, CancellationToken ct)
    {
        if (context.Duration > SlowThreshold)
        {
            await _alerts.SendSlowRequestAlertAsync(
                context.RequestName,
                context.Duration,
                ct);
        }
    }

    public Task OnFailed(ObservabilityContext context, CancellationToken ct) => Task.CompletedTask;
}
```

## Registration

Multiple observers can be registered — all run for every request:

```csharp
builder.Services.AddObservability();

// Register observers
builder.Services.AddTransient<IRequestObserver, LoggingObserver>();
builder.Services.AddTransient<IRequestObserver, SlowRequestAlertObserver>();
```

:::note
If one observer throws an exception, the others still run. All exceptions are collected into an `AggregateException`. Design observers to be resilient — wrap their logic in try/catch if they call external systems.
:::

## Built-in: ConsoleLoggingObserver

For development, use the built-in console observer:

```csharp
builder.Services.AddObservability(config =>
{
    config.UseObserver<ConsoleLoggingObserver>();
});
```
