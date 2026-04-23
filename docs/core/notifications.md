---
id: notifications
title: Notifications & Events
---

import Drawio from '@theme/Drawio';
import fanOut from '@site/static/diagrams/fan-out.drawio';

# Notifications & Events

Notifications implement the **fan-out** pattern — one notification published to **N handlers**. They are ideal for domain events and decoupled side effects.

## Fan-Out Flow

<Drawio content={fanOut} />

## Defining Notifications

```csharp
public record OrderPlacedEvent(
    Guid OrderId,
    string CustomerId,
    decimal TotalAmount) : INotification;
```

## Implementing Handlers

```csharp
// Send confirmation email (highest priority — runs first)
public class SendConfirmationEmailHandler : INotificationHandler<OrderPlacedEvent>
{
    public int Priority => 10;

    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _emailService.SendOrderConfirmationAsync(
            notification.CustomerId,
            notification.OrderId);
    }
}

// Update inventory
public class UpdateInventoryHandler : INotificationHandler<OrderPlacedEvent>
{
    public int Priority => 5;

    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _inventoryService.ReserveItemsForOrderAsync(notification.OrderId);
    }
}

// Track analytics (lowest priority — runs last)
public class TrackOrderAnalyticsHandler : INotificationHandler<OrderPlacedEvent>
{
    // Priority defaults to 0 — no override needed
    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _analytics.TrackPurchaseAsync(notification.TotalAmount);
    }
}
```

## Priority

The `Priority` property controls handler execution order. **Higher value = runs first**.

```csharp
public interface INotificationHandler<TNotification>
{
    int Priority => 0; // default implementation
    Task Handle(TNotification notification, CancellationToken ct);
}
```

| Priority | Order |
|----------|-------|
| 100 | First |
| 10 | Second |
| 0 (default) | Later |
| -10 | Last |

## Publishing

```csharp
// Sequential (default) — handlers run one after another in priority order
await _mediator.Publish(new OrderPlacedEvent(orderId, customerId, total));

// Parallel — all handlers run concurrently (Task.WhenAll)
await _mediator.Publish(new OrderPlacedEvent(orderId, customerId, total),
    PublishStrategy.Parallel);

// ResilientParallel — all handlers run even if some fail
// Failures are captured in IDeadLetterQueue if registered
await _mediator.Publish(new OrderPlacedEvent(orderId, customerId, total),
    PublishStrategy.ResilientParallel);
```

### Publish Strategy Comparison

| Strategy | Behavior | On Failure |
|----------|----------|------------|
| `Sequential` | Handlers run in priority order | First failure stops execution |
| `Parallel` | All handlers start concurrently | Any failure throws `AggregateException` |
| `ResilientParallel` | All handlers run regardless | Failures go to `IDeadLetterQueue` |

## Notification Filter

Implement `INotificationFilter<TNotification>` on a handler to conditionally skip it:

```csharp
public class HighValueOrderAnalyticsHandler
    : INotificationHandler<OrderPlacedEvent>,
      INotificationFilter<OrderPlacedEvent>
{
    public bool ShouldHandle(OrderPlacedEvent notification, CancellationToken ct)
    {
        // Only run this handler for orders over $1000
        return notification.TotalAmount >= 1000;
    }

    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _analytics.TrackHighValuePurchaseAsync(notification.TotalAmount);
    }
}
```

:::note
When `ShouldHandle` returns `false`, the handler is silently skipped — no exception is thrown.
:::
