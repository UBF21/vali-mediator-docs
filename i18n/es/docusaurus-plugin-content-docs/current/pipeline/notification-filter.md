---
id: notification-filter
title: Filtro de Notificaciones
---

# Filtro de Notificaciones

`INotificationFilter<TNotification>` permite que un handler omita condicionalmente su propia ejecución según los datos de la notificación.

## Interfaz

```csharp
public interface INotificationFilter<TNotification> where TNotification : INotification
{
    bool ShouldHandle(TNotification notification, CancellationToken ct);
}
```

## Uso

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

    // Filtro: solo manejar eventos de clientes premium
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

## Comportamiento

- Cuando `ShouldHandle` retorna `false`, el handler se **omite silenciosamente** — no se lanza ninguna excepción
- Cuando `ShouldHandle` retorna `true`, el handler se ejecuta normalmente
- Los demás handlers no se ven afectados

## Ejemplo: Flag de Característica

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
