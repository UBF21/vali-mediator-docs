---
id: policy-providers
title: Policy Providers
---

# Policy Providers

Los policy providers son la forma recomendada de asociar políticas de resiliencia a tus requests. Mantienen la configuración de políticas fuera del modelo de comando/query — tus objetos de dominio se mantienen enfocados en datos, mientras que la infraestructura vive en clases dedicadas o en el registro de startup.

## Orden de Resolución

`ResilienceBehavior` resuelve la política para cada request en este orden:

| Prioridad | Mecanismo | Cuándo usarlo |
|-----------|-----------|---------------|
| 1 | `AddResiliencePolicy<T>` / `AddResiliencePolicyProvider<T,P>` | **Recomendado** — política separada del comando |
| 2 | `IResilient` en el comando | Obsoleto — solo para compatibilidad |
| 3 | `AddGlobalResiliencePolicy` | Por defecto para todos los requests sin política específica |

Si no se encuentra ninguna política, el request pasa sin ningún envoltorio de resiliencia.

---

## Registro Inline (sin clase)

Para la mayoría de los casos, una lambda en startup es suficiente:

```csharp
// Program.cs
services.AddResiliencePolicy<LoginCommand>(req =>
    ResiliencePolicy.Create()
        .RateLimiter(opts =>
        {
            opts.Algorithm = RateLimiterAlgorithm.SlidingWindow;
            opts.PermitLimit = 5;
            opts.Window = TimeSpan.FromMinutes(1);
            opts.PartitionKeyResolver = r => ((LoginCommand)r).Email;
        })
        .Build());

services.AddResiliencePolicy<PlaceOrderCommand>(req =>
    ResiliencePolicy.Create("place-order")
        .Retry(3)
        .CircuitBreaker(opts =>
        {
            opts.CircuitKey = "payment-gateway";
            opts.FailureThreshold = 5;
            opts.BreakDuration = TimeSpan.FromSeconds(30);
        })
        .Timeout(TimeSpan.FromSeconds(10))
        .Build());
```

El comando en sí queda limpio — sin preocupaciones de infraestructura:

```csharp
public class LoginCommand : IRequest<Result<string>>
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
```

---

## Provider por Clase

Usá una clase cuando el provider necesita dependencias inyectadas como `IOptions`, `ILogger` o feature flags:

```csharp
public class PlaceOrderPolicyProvider : IResiliencePolicyProvider<PlaceOrderCommand>
{
    private readonly ResilienceSettings _settings;

    public PlaceOrderPolicyProvider(IOptions<ResilienceSettings> opts)
        => _settings = opts.Value;

    public ResiliencePolicy GetPolicy(PlaceOrderCommand request) =>
        ResiliencePolicy.Create("place-order")
            .Retry(opts =>
            {
                opts.MaxRetries = _settings.MaxRetries;
                opts.BackoffType = BackoffType.ExponentialWithJitter;
                opts.RetryOnErrorTypes.Add(ErrorType.Failure);
            })
            .CircuitBreaker(opts =>
            {
                opts.CircuitKey = "payment-gateway";
                opts.FailureThreshold = _settings.CircuitBreakerThreshold;
                opts.BreakDuration = TimeSpan.FromSeconds(_settings.BreakDurationSeconds);
            })
            .Timeout(TimeSpan.FromSeconds(10))
            .Build();
}

// Registro
services.AddResiliencePolicyProvider<PlaceOrderCommand, PlaceOrderPolicyProvider>();
```

:::tip Lifetime
`AddResiliencePolicyProvider` usa `Scoped` por defecto. Si el provider no tiene dependencias con scope, pasá `ServiceLifetime.Singleton` para mejor performance.
:::

---

## Política Global

Una política global es el fallback para todos los requests que no tienen un provider específico:

```csharp
// Política fija para todo
services.AddGlobalResiliencePolicy(
    ResiliencePolicy.Create()
        .Retry(3)
        .Timeout(TimeSpan.FromSeconds(30))
        .Build());
```

El overload con factory recibe el objeto request, útil para diferenciar por tipo:

```csharp
services.AddGlobalResiliencePolicy(req =>
    ResiliencePolicy.Create()
        .Retry(req is IQuery ? 3 : 1)
        .Timeout(TimeSpan.FromSeconds(30))
        .Build());
```

:::note
La política global usa `AddSingleton` internamente.
:::

---

## Ejemplo Completo en Program.cs

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddResilienceBehavior();
});

// Global: retry + timeout para todo
builder.Services.AddGlobalResiliencePolicy(
    ResiliencePolicy.Create()
        .Retry(3)
        .Timeout(TimeSpan.FromSeconds(30))
        .Build());

// Login: rate limit por usuario (sobreescribe el global)
builder.Services.AddResiliencePolicy<LoginCommand>(req =>
    ResiliencePolicy.Create()
        .RateLimiter(opts =>
        {
            opts.Algorithm = RateLimiterAlgorithm.SlidingWindow;
            opts.PermitLimit = 5;
            opts.Window = TimeSpan.FromMinutes(1);
            opts.PartitionKeyResolver = r => ((LoginCommand)r).Email;
        })
        .Build());

// Pago: circuit breaker vía clase (necesita IOptions)
builder.Services.AddResiliencePolicyProvider<PlaceOrderCommand, PlaceOrderPolicyProvider>();
```
