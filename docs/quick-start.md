---
id: quick-start
title: Quick Start
---

# Quick Start

This guide walks you through the minimal setup to send your first request with Vali-Mediator.

## 1. Install the Package

```bash
dotnet add package Vali-Mediator
```

## 2. Define a Request

A request carries data and declares its response type via the generic parameter:

```csharp
// A command that creates an order and returns an order ID
public record CreateOrderCommand(string ProductId, int Quantity)
    : IRequest<Result<string>>;
```

## 3. Implement the Handler

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
            return Result<string>.Fail("Quantity must be greater than zero.", ErrorType.Validation);

        var orderId = await _repository.CreateAsync(request.ProductId, request.Quantity);
        return Result<string>.Ok(orderId);
    }
}
```

## 4. Register in DI

```csharp
// Program.cs
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
});
```

## 5. Send the Request

Inject `IValiMediator` and call `Send`:

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

## Notifications (Events)

Publish an event to multiple handlers:

```csharp
// Define the notification
public record OrderCreatedEvent(string OrderId, string ProductId) : INotification;

// Handler 1 — send confirmation email
public class SendOrderConfirmationHandler : INotificationHandler<OrderCreatedEvent>
{
    public async Task Handle(OrderCreatedEvent notification, CancellationToken ct)
    {
        await _emailService.SendConfirmationAsync(notification.OrderId);
    }
}

// Handler 2 — update inventory
public class UpdateInventoryHandler : INotificationHandler<OrderCreatedEvent>
{
    public async Task Handle(OrderCreatedEvent notification, CancellationToken ct)
    {
        await _inventoryService.DecrementAsync(notification.ProductId);
    }
}

// Publish — both handlers run
await _mediator.Publish(new OrderCreatedEvent(orderId, productId));
```

## With ASP.NET Core Integration

Install `Vali-Mediator.AspNetCore` for automatic HTTP mapping:

```csharp
// MVC Controller
public async Task<IActionResult> CreateOrder(CreateOrderCommand cmd)
{
    Result<string> result = await _mediator.Send(cmd);
    return result.ToActionResult(); // 200, 400, 404, 409, 500 automatically
}

// Minimal API
app.MapPost("/orders", async (CreateOrderCommand cmd, IValiMediator m) =>
{
    Result<string> result = await m.Send(cmd);
    return result.ToHttpResult(); // IResult with correct status
});
```

:::tip Next Steps
- Learn about [Requests & Commands](core/requests) in depth
- Add cross-cutting concerns with [Pipeline Behaviors](pipeline/behaviors)
- Use the [Result Pattern](result/overview) for structured error handling
- Add [Resilience](resilience/overview) policies for fault tolerance
:::
