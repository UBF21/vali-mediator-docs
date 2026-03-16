---
id: quick-start
title: Inicio Rápido
---

# Inicio Rápido

Esta guía te lleva por la configuración mínima para enviar tu primera solicitud con Vali-Mediator.

## 1. Instalar el Paquete

```bash
dotnet add package Vali-Mediator
```

## 2. Definir una Solicitud

Una solicitud lleva datos y declara su tipo de respuesta mediante el parámetro genérico:

```csharp
// Un comando que crea una orden y retorna un ID de orden
public record CreateOrderCommand(string ProductId, int Quantity)
    : IRequest<Result<string>>;
```

## 3. Implementar el Handler

```csharp
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, Result<string>>
{
    private readonly IOrderRepository _repository;

    public CreateOrderHandler(IOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<string>> Handle(
        CreateOrderCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Quantity <= 0)
            return Result<string>.Fail("La cantidad debe ser mayor a cero.", ErrorType.Validation);

        var orderId = await _repository.CreateAsync(request.ProductId, request.Quantity);
        return Result<string>.Ok(orderId);
    }
}
```

## 4. Registrar en DI

```csharp
// Program.cs
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
});
```

## 5. Enviar la Solicitud

Inyecta `IValiMediator` y llama a `Send`:

```csharp
public class OrdersController : ControllerBase
{
    private readonly IValiMediator _mediator;

    public OrdersController(IValiMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder(CreateOrderRequest dto)
    {
        var command = new CreateOrderCommand(dto.ProductId, dto.Quantity);
        Result<string> result = await _mediator.Send(command);

        if (result.IsFailure)
            return BadRequest(result.Error);

        return Ok(new { orderId = result.Value });
    }
}
```

## Notificaciones (Eventos)

Publica un evento a múltiples handlers:

```csharp
// Definir la notificación
public record OrderCreatedEvent(string OrderId, string ProductId) : INotification;

// Handler 1 — envía email de confirmación
public class SendOrderConfirmationHandler : INotificationHandler<OrderCreatedEvent>
{
    public async Task Handle(OrderCreatedEvent notification, CancellationToken ct)
    {
        await _emailService.SendConfirmationAsync(notification.OrderId);
    }
}

// Handler 2 — actualiza inventario
public class UpdateInventoryHandler : INotificationHandler<OrderCreatedEvent>
{
    public async Task Handle(OrderCreatedEvent notification, CancellationToken ct)
    {
        await _inventoryService.DecrementAsync(notification.ProductId);
    }
}

// Publicar — ambos handlers se ejecutan
await _mediator.Publish(new OrderCreatedEvent(orderId, productId));
```

## Con Integración ASP.NET Core

Instala `Vali-Mediator.AspNetCore` para mapeo HTTP automático:

```csharp
// Controlador MVC
public async Task<IActionResult> CreateOrder(CreateOrderCommand cmd)
{
    Result<string> result = await _mediator.Send(cmd);
    return result.ToActionResult(); // 200, 400, 404, 409, 500 automáticamente
}

// Minimal API
app.MapPost("/orders", async (CreateOrderCommand cmd, IValiMediator m) =>
{
    Result<string> result = await m.Send(cmd);
    return result.ToHttpResult();
});
```
