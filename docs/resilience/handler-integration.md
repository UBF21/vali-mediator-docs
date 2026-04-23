---
id: handler-integration
title: Handler Integration
---

import Drawio from '@theme/Drawio';
import handlerResilience from '@site/static/diagrams/handler-resilience.drawio';

# Handler Integration

`ResilienceBehavior<TRequest, TResponse>` intercepts every request dispatched through Vali-Mediator and automatically wraps handler execution with the resolved policy — no changes needed in the handler itself.

## How It Works

<Drawio content={handlerResilience} />

## Registration

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddResilienceBehavior();
});
```

---

## Recommended: Policy Providers

The preferred way to attach a policy is via `AddResiliencePolicy<T>` or `IResiliencePolicyProvider<TRequest>`. This keeps the command clean — no infrastructure properties mixed into the domain model.

See [Policy Providers](./policy-providers) for the full guide.

```csharp
// Command — pure domain data, no policy property
public class PlaceOrderCommand : IRequest<Result<string>>
{
    public string OrderId { get; init; } = string.Empty;
    public decimal Amount { get; init; }
}

// Policy registered at startup
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

## Deprecated: IResilient on the Command

:::warning Deprecated in v1.2.0
`IResilient` is kept for backward compatibility but should not be used in new code.
Putting a `ResiliencePolicy` property on the command mixes infrastructure with domain data — the policy object gets serialized alongside command fields.
Use `services.AddResiliencePolicy<T>()` instead.
:::

```csharp
// ❌ Old approach — policy lives on the command
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
// ✅ New approach — policy separate from the command
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

## Policy Resolution Order

| Priority | Mechanism |
|----------|-----------|
| 1 | `AddResiliencePolicy<T>` / `AddResiliencePolicyProvider<T,P>` |
| 2 | `IResilient` on the command (deprecated) |
| 3 | `AddGlobalResiliencePolicy` |
| — | No policy → request passes through as-is |
