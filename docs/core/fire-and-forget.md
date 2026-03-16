---
id: fire-and-forget
title: Fire and Forget
---

# Fire and Forget

Fire-and-forget dispatches a command to **exactly one handler** with **no return value**. Unlike notifications, there is no fan-out — one handler, one operation.

## Differences from Requests and Notifications

| | `IRequest<T>` | `INotification` | `IFireAndForget` |
|-|--------------|-----------------|-----------------|
| Handlers | 1 | N | 1 |
| Response | `TResponse` | None | None |
| Pipeline | Yes | Yes | Yes |
| Use case | Query/Command | Domain events | Background ops |

## Defining Fire-and-Forget Commands

```csharp
public record SendAuditLogCommand(
    string UserId,
    string Action,
    string Resource) : IFireAndForget;
```

## Implementing the Handler

```csharp
public class SendAuditLogHandler : IFireAndForgetHandler<SendAuditLogCommand>
{
    private readonly IAuditRepository _auditRepository;

    public SendAuditLogHandler(IAuditRepository auditRepository)
    {
        _auditRepository = auditRepository;
    }

    public async Task Handle(SendAuditLogCommand command, CancellationToken ct)
    {
        await _auditRepository.LogAsync(new AuditEntry
        {
            UserId = command.UserId,
            Action = command.Action,
            Resource = command.Resource,
            Timestamp = DateTimeOffset.UtcNow
        }, ct);
    }
}
```

## Dispatching

Use `Dispatch` to send a fire-and-forget command:

```csharp
await _mediator.Dispatch(new SendAuditLogCommand(
    userId: currentUser.Id,
    action: "CreateOrder",
    resource: $"orders/{orderId}"));
```

## Common Use Cases

- **Audit logging** — record user actions without blocking the main flow
- **Cache invalidation** — invalidate a cache entry asynchronously
- **Telemetry** — send metrics or traces to external systems
- **Webhook dispatch** — fire a webhook notification

:::tip
If you need multiple handlers to react to the same event, use `INotification` instead. Fire-and-forget is for single-handler side effects.
:::

## Pipeline Support

Fire-and-forget commands go through the full pipeline just like requests:

```csharp
// A dispatch behavior that logs all fire-and-forget operations
public class AuditDispatchBehavior<TDispatch> : IPipelineBehavior<TDispatch>
    where TDispatch : IFireAndForget
{
    public async Task Handle(TDispatch dispatch, Func<Task> next, CancellationToken ct)
    {
        Console.WriteLine($"[Dispatch] {typeof(TDispatch).Name}");
        await next();
    }
}

// Register it
config.AddDispatchBehavior<AuditDispatchBehavior<MyFireAndForget>>();
// Or open-generic:
config.AddBehavior(typeof(IPipelineBehavior<>), typeof(AuditDispatchBehavior<>));
```
