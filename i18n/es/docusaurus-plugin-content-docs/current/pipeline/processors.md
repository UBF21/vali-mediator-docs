---
id: processors
title: Pre y Post Procesadores
---

# Pre y Post Procesadores

Los procesadores son hooks ligeros que se ejecutan antes y después del handler. A diferencia de los behaviors, no envuelven la llamada — son efectos secundarios de tipo fire-and-forget.

## Orden de Ejecución

```
PreProcessadores → [Pipeline Behaviors] → Handler → PostProcessadores
```

## Pre-Procesadores

Se ejecutan **antes** de que el handler ejecute. Útiles para validación, logging, comprobaciones de autenticación.

```csharp
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

## Post-Procesadores

Se ejecutan **después** de que el handler ejecute. Útiles para logging de respuestas, publicar eventos, calentar caché.

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

## Auto-Descubrimiento

Los procesadores se **descubren automáticamente** desde los assemblies escaneados — no se necesita registro manual:

```csharp
builder.Services.AddValiMediator(config =>
{
    // Todos IPreProcessor<> e IPostProcessor<,> en este assembly se registran automáticamente
    config.RegisterServicesFromAssemblyContaining<Program>();
});
```

:::note
- `IPreProcessor<TRequest>.Process()` retorna `Task` (async)
- `IPostProcessor<TRequest, TResponse>.Process()` retorna `Task` (async)
:::
