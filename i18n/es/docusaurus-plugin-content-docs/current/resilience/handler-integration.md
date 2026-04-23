---
id: handler-integration
title: Integración en Handlers
---

import Drawio from '@theme/Drawio';
import handlerResilience from '@site/static/diagrams/handler-resilience.drawio';

# Integración en Handlers

`ResilienceBehavior<TRequest, TResponse>` intercepta cada request despachado por Vali-Mediator y envuelve automáticamente la ejecución del handler con la política resuelta — sin cambios en el handler.

## Cómo Funciona

<Drawio content={handlerResilience} />

## Registro

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddResilienceBehavior();
});
```

---

## Recomendado: Policy Providers

La forma preferida de asociar una política es mediante `AddResiliencePolicy<T>` o `IResiliencePolicyProvider<TRequest>`. Esto mantiene el comando limpio — sin propiedades de infraestructura mezcladas en el modelo de dominio.

Ver [Policy Providers](./policy-providers) para la guía completa.

```csharp
// Comando — datos de dominio puros, sin propiedad Policy
public class PlaceOrderCommand : IRequest<Result<string>>
{
    public string OrderId { get; init; } = string.Empty;
    public decimal Amount { get; init; }
}

// Política registrada en startup
services.AddResiliencePolicy<PlaceOrderCommand>(_ =>
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

---

## Deprecado: IResilient en el Comando

:::warning Deprecado en v1.2.0
`IResilient` se mantiene por compatibilidad pero no debe usarse en código nuevo.
Poner una propiedad `ResiliencePolicy` en el comando mezcla infraestructura con datos de dominio — el objeto policy se serializa junto con los campos del comando.
Usá `services.AddResiliencePolicy<T>()` en su lugar.
:::

```csharp
// ❌ Enfoque antiguo — política en el comando
[Obsolete]
public class CallPaymentGatewayCommand : IRequest<Result<PaymentDto>>, IResilient
{
    public string OrderId { get; init; } = string.Empty;

    private static readonly ResiliencePolicy _policy = ResiliencePolicy
        .Create("payment-gateway")
        .Retry(3)
        .Timeout(TimeSpan.FromSeconds(10))
        .Build();

    public ResiliencePolicy Policy => _policy;
}
```

```csharp
// ✅ Enfoque nuevo — política separada del comando
public class CallPaymentGatewayCommand : IRequest<Result<PaymentDto>>
{
    public string OrderId { get; init; } = string.Empty;
}

services.AddResiliencePolicy<CallPaymentGatewayCommand>(_ =>
    ResiliencePolicy.Create("payment-gateway")
        .Retry(3)
        .Timeout(TimeSpan.FromSeconds(10))
        .Build());
```

---

## Orden de Resolución

| Prioridad | Mecanismo |
|-----------|-----------|
| 1 | `AddResiliencePolicy<T>` / `AddResiliencePolicyProvider<T,P>` |
| 2 | `IResilient` en el comando (deprecado) |
| 3 | `AddGlobalResiliencePolicy` |
| — | Sin política → el request pasa sin modificaciones |
