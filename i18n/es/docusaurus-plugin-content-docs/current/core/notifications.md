---
id: notifications
title: Notificaciones y Eventos
---

# Notificaciones y Eventos

Las notificaciones implementan el patrón **fan-out** — una notificación publicada a **N handlers**. Son ideales para eventos de dominio y efectos secundarios desacoplados.

## Definir Notificaciones

```csharp
public record OrderPlacedEvent(
    Guid OrderId,
    string CustomerId,
    decimal TotalAmount) : INotification;
```

## Implementar Handlers

```csharp
// Enviar email de confirmación (mayor prioridad — ejecuta primero)
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

// Actualizar inventario
public class UpdateInventoryHandler : INotificationHandler<OrderPlacedEvent>
{
    public int Priority => 5;

    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _inventoryService.ReserveItemsForOrderAsync(notification.OrderId);
    }
}

// Tracking analítico (menor prioridad — ejecuta último)
public class TrackOrderAnalyticsHandler : INotificationHandler<OrderPlacedEvent>
{
    // Priority es 0 por defecto — no es necesario sobreescribirlo
    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _analytics.TrackPurchaseAsync(notification.TotalAmount);
    }
}
```

## Prioridad

La propiedad `Priority` controla el orden de ejecución de los handlers. **Mayor valor = ejecuta primero**.

## Publicar

```csharp
// Secuencial (por defecto) — handlers ejecutan uno tras otro en orden de prioridad
await _mediator.Publish(new OrderPlacedEvent(orderId, customerId, total));

// Paralelo — todos los handlers ejecutan concurrentemente (Task.WhenAll)
await _mediator.Publish(new OrderPlacedEvent(orderId, customerId, total),
    PublishStrategy.Parallel);

// ResilientParallel — todos los handlers ejecutan aunque algunos fallen
// Los fallos se capturan en IDeadLetterQueue si está registrado
await _mediator.Publish(new OrderPlacedEvent(orderId, customerId, total),
    PublishStrategy.ResilientParallel);
```

## Filtro de Notificaciones

```csharp
public class HighValueOrderAnalyticsHandler
    : INotificationHandler<OrderPlacedEvent>,
      INotificationFilter<OrderPlacedEvent>
{
    public bool ShouldHandle(OrderPlacedEvent notification, CancellationToken ct)
    {
        // Solo ejecutar para órdenes mayores a $1000
        return notification.TotalAmount >= 1000;
    }

    public async Task Handle(OrderPlacedEvent notification, CancellationToken ct)
    {
        await _analytics.TrackHighValuePurchaseAsync(notification.TotalAmount);
    }
}
```
