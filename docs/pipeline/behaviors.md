---
id: behaviors
title: Pipeline Behaviors
---

import Drawio from '@theme/Drawio';
import pipelineBehaviors from '@site/static/diagrams/pipeline-behaviors.drawio';

# Pipeline Behaviors

Pipeline behaviors wrap handler execution, enabling cross-cutting concerns like logging, validation, caching, and resilience — without touching handler code.

## The Onion Model

<Drawio content={pipelineBehaviors} />

**First registered = outermost** (executes first before the handler, last after).

## For Requests

Implement `IPipelineBehavior<TRequest, TResponse>`:

```csharp
public class LoggingBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        Func<Task<TResponse>> next,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Handling {RequestType}", typeof(TRequest).Name);

        var response = await next();

        _logger.LogInformation("Handled {RequestType}", typeof(TRequest).Name);

        return response;
    }
}
```

## For Notifications and Fire-and-Forget

Implement `IPipelineBehavior<TDispatch>`:

```csharp
public class NotificationLoggingBehavior<TNotification>
    : IPipelineBehavior<TNotification>
    where TNotification : INotification
{
    public async Task Handle(
        TNotification notification,
        Func<Task> next,
        CancellationToken cancellationToken)
    {
        Console.WriteLine($"[Notification] Publishing {typeof(TNotification).Name}");
        await next();
        Console.WriteLine($"[Notification] Published {typeof(TNotification).Name}");
    }
}
```

## Registering Behaviors

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Closed generic (specific request type)
    config.AddRequestBehavior<LoggingBehavior<CreateOrderCommand, Result<string>>>();

    // Open generic (applies to all requests)
    config.AddBehavior(
        typeof(IPipelineBehavior<,>),
        typeof(LoggingBehavior<,>));

    // Dispatch (notifications/fire-and-forget)
    config.AddDispatchBehavior<NotificationLoggingBehavior<OrderPlacedEvent>>();

    // Open generic dispatch
    config.AddBehavior(
        typeof(IPipelineBehavior<>),
        typeof(NotificationLoggingBehavior<>));
});
```

:::tip
Register behaviors in the order you want them to wrap: **first registered = outermost**.

For example, to have logging wrap validation:
```csharp
config.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));    // outermost
config.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>)); // innermost
```
:::

## Validation Behavior Example

```csharp
public class ValidationBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : IResult
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        Func<Task<TResponse>> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
            return await next();

        var errors = _validators
            .SelectMany(v => v.Validate(request).Errors)
            .GroupBy(e => e.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<string>)g.Select(e => e.ErrorMessage).ToList());

        if (errors.Count > 0)
        {
            // Return a validation failure — works because TResponse : IResult
            return (TResponse)(object)Result<object>.Fail(errors, ErrorType.Validation);
        }

        return await next();
    }
}
```
