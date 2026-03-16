---
id: notification-filter
title: Notification Filter
---

# Notification Filter

`INotificationFilter<TNotification>` allows a handler to conditionally skip its own execution based on the notification's data.

## Interface

```csharp
public interface INotificationFilter<TNotification> where TNotification : INotification
{
    bool ShouldHandle(TNotification notification, CancellationToken ct);
}
```

## Usage

Implement `INotificationFilter<TNotification>` alongside `INotificationHandler<TNotification>` on the same class:

```csharp
public class PremiumCustomerEmailHandler
    : INotificationHandler<OrderPlacedEvent>,
      INotificationFilter<OrderPlacedEvent>
{
    private readonly ICustomerService _customerService;

    public PremiumCustomerEmailHandler(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    // Filter: only handle events for premium customers
    public bool ShouldHandle(OrderPlacedEvent notification, CancellationToken ct)
    {
        return _customerService.IsPremium(notification.CustomerId);
    }

    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _emailService.SendPremiumOrderConfirmationAsync(
            notification.CustomerId,
            notification.OrderId);
    }
}
```

## Behavior

- When `ShouldHandle` returns `false`, the handler is **silently skipped** — no exception is thrown
- When `ShouldHandle` returns `true`, the handler executes normally
- Other handlers (without this filter, or with `ShouldHandle = true`) are unaffected

## Examples

### Filter by Notification Value

```csharp
public class HighValueOrderAlertHandler
    : INotificationHandler<OrderPlacedEvent>,
      INotificationFilter<OrderPlacedEvent>
{
    public bool ShouldHandle(OrderPlacedEvent notification, CancellationToken ct)
    {
        // Only alert for orders over $5,000
        return notification.TotalAmount > 5000;
    }

    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _alertService.SendHighValueOrderAlertAsync(notification.OrderId);
    }
}
```

### Feature Flag Filter

```csharp
public class BetaFeatureNotificationHandler
    : INotificationHandler<UserRegisteredEvent>,
      INotificationFilter<UserRegisteredEvent>
{
    private readonly IFeatureFlags _featureFlags;

    public BetaFeatureNotificationHandler(IFeatureFlags featureFlags)
    {
        _featureFlags = featureFlags;
    }

    public bool ShouldHandle(UserRegisteredEvent notification, CancellationToken ct)
    {
        return _featureFlags.IsEnabled("BetaWelcomeEmail");
    }

    public async Task Handle(UserRegisteredEvent notification, CancellationToken ct)
    {
        await _emailService.SendBetaWelcomeEmailAsync(notification.UserId);
    }
}
```

:::tip
Use `INotificationFilter<T>` when the filter logic is specific to **that handler's concerns**. For global filtering that applies to all handlers, use a pipeline behavior instead.
:::
