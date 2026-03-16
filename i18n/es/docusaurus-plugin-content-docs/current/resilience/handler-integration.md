---
id: handler-integration
title: Integración en Handlers
---

# Integración en Handlers

En lugar de crear y gestionar políticas manualmente, puedes declarar una política de resiliencia directamente en una clase handler usando la interfaz `IResilient`.

## IResilient

```csharp
public interface IResilient
{
    ResiliencePolicy ResiliencePolicy { get; }
}
```

## Implementación

```csharp
public class GetProductHandler
    : IRequestHandler<GetProductQuery, Result<ProductDto>>,
      IResilient
{
    private static readonly ResiliencePolicy Policy = ResiliencePolicy.Create()
        .Retry(opts =>
        {
            opts.MaxRetries = 3;
            opts.BackoffType = BackoffType.Exponential;
            opts.DelayMs = 200;
        })
        .CircuitBreaker(opts =>
        {
            opts.CircuitKey = "product-db";
            opts.FailureThreshold = 5;
            opts.BreakDuration = TimeSpan.FromSeconds(30);
        })
        .Timeout(TimeSpan.FromSeconds(5))
        .Build();

    // Implementación de IResilient
    public ResiliencePolicy ResiliencePolicy => Policy;

    private readonly IProductRepository _repository;

    public GetProductHandler(IProductRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<ProductDto>> Handle(
        GetProductQuery request,
        CancellationToken ct)
    {
        var product = await _repository.GetByIdAsync(request.ProductId, ct);

        if (product is null)
            return Result<ProductDto>.Fail("Producto no encontrado.", ErrorType.NotFound);

        return Result<ProductDto>.Ok(product.ToDto());
    }
}
```

:::note
Declara la política como `static readonly` para evitar recrearla en cada instanciación del handler. La política mantiene estado interno (circuit breaker, rate limiter) que debe persistir entre llamadas.
:::

## Registro

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Habilita ResilienceBehavior — se aplica automáticamente a handlers que implementan IResilient
    config.AddResilienceBehavior();
});
```

## Políticas por Handler

```csharp
// Lecturas rápidas — usa hedge para baja latencia
public class GetProductHandler : IRequestHandler<GetProductQuery, Result<ProductDto>>, IResilient
{
    public ResiliencePolicy ResiliencePolicy { get; } = ResiliencePolicy.Create()
        .Hedge(TimeSpan.FromMilliseconds(50))
        .Timeout(TimeSpan.FromSeconds(1))
        .Build();
}

// Pagos — usa retry + circuit breaker
public class ProcessPaymentHandler : IRequestHandler<ProcessPaymentCommand, Result<string>>, IResilient
{
    public ResiliencePolicy ResiliencePolicy { get; } = ResiliencePolicy.Create()
        .Fallback<Result<string>>(opts =>
        {
            opts.FallbackValue = Result<string>.Fail("Pago no disponible", ErrorType.Failure);
        })
        .Retry(2)
        .CircuitBreaker(opts =>
        {
            opts.CircuitKey = "payment-gateway";
            opts.FailureThreshold = 3;
            opts.BreakDuration = TimeSpan.FromMinutes(1);
        })
        .Timeout(TimeSpan.FromSeconds(30))
        .Build();
}
```
