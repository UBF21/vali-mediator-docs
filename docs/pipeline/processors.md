---
id: processors
title: Pre & Post Processors
---

# Pre & Post Processors

Processors are lightweight hooks that run before and after the handler. Unlike behaviors, they don't wrap the call — they are fire-and-forget side effects.

## Execution Order

```
PreProcessors → [Pipeline Behaviors] → Handler → PostProcessors
```

## Pre-Processors

Run **before** the handler executes. Useful for validation, logging, authentication checks.

### For Requests

```csharp
// IPreProcessor<TRequest> — runs before any request of this type
public class AuditPreProcessor : IPreProcessor<CreateOrderCommand>
{
    private readonly IAuditService _audit;

    public AuditPreProcessor(IAuditService audit)
    {
        _audit = audit;
    }

    public async Task Process(CreateOrderCommand request, CancellationToken ct)
    {
        await _audit.RecordAttemptAsync("CreateOrder", ct);
    }
}
```

### Generic Pre-Processor (All Requests)

```csharp
public class LogRequestPreProcessor<TRequest> : IPreProcessor<TRequest>
{
    private readonly ILogger<LogRequestPreProcessor<TRequest>> _logger;

    public LogRequestPreProcessor(ILogger<LogRequestPreProcessor<TRequest>> logger)
    {
        _logger = logger;
    }

    public Task Process(TRequest request, CancellationToken ct)
    {
        _logger.LogDebug("Processing request: {RequestType}", typeof(TRequest).Name);
        return Task.CompletedTask;
    }
}
```

## Post-Processors

Run **after** the handler executes. Useful for logging responses, publishing events, cache warming.

```csharp
public class OrderCreatedPostProcessor
    : IPostProcessor<CreateOrderCommand, Result<string>>
{
    private readonly IValiMediator _mediator;

    public OrderCreatedPostProcessor(IValiMediator mediator)
    {
        _mediator = mediator;
    }

    public async Task Process(
        CreateOrderCommand request,
        Result<string> response,
        CancellationToken ct)
    {
        if (response.IsSuccess)
        {
            await _mediator.Publish(
                new OrderCreatedEvent(response.Value, request.CustomerId), ct);
        }
    }
}
```

## Auto-Discovery

Processors are **automatically discovered** from the scanned assemblies — no manual registration needed. Just implement the interface and register your assembly:

```csharp
builder.Services.AddValiMediator(config =>
{
    // All IPreProcessor<> and IPostProcessor<,> in this assembly are auto-registered
    config.RegisterServicesFromAssemblyContaining<Program>();
});
```

:::note
- `IPreProcessor<TRequest>.Process()` returns `Task` (async)
- `IPostProcessor<TRequest, TResponse>.Process()` returns `Task` (async)
- Both run for every matching request automatically
- Multiple processors of the same type are supported
:::

## Processor vs Behavior

| | Processor | Behavior |
|-|-----------|----------|
| Can short-circuit | No | Yes (don't call `next()`) |
| Has access to response | Post only | Yes (wraps entire call) |
| Registration | Auto-discovered | Manual |
| Use case | Simple side effects | Complex cross-cutting logic |
