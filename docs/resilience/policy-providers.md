---
id: policy-providers
title: Policy Providers
---

# Policy Providers

Policy providers are the recommended way to attach resilience policies to your requests. They keep policy configuration out of the command/query model — your domain objects stay focused on data, while infrastructure lives in dedicated classes or startup registration.

## Resolution Order

`ResilienceBehavior` resolves the policy for each request in this order:

| Priority | Mechanism | Use when |
|----------|-----------|----------|
| 1 | `AddResiliencePolicy<T>` / `AddResiliencePolicyProvider<T,P>` | Recommended — policy separate from the command |
| 2 | `IResilient` on the command | Deprecated — backward compat only |
| 3 | `AddGlobalResiliencePolicy` | Default for all requests without a specific policy |

If no policy is found the request passes through without any resilience wrapping.

---

## Inline Registration (no class needed)

For most cases a lambda at startup is all you need:

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

:::note Policy caching (v1.2.2+)
The `ResiliencePolicy` is resolved **once** per request type and cached for the lifetime of the application — regardless of whether you use a lambda or a class-based provider. Stateful policies (Circuit Breaker, Rate Limiter, Bulkhead, Hedge) preserve their accumulated state across all subsequent requests of the same type.
:::

The command itself stays clean — no infrastructure concerns:

```csharp
public class LoginCommand : IRequest<Result<string>>
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
```

---

## Class-Based Provider

Use a class when the provider needs injected dependencies such as `IOptions`, `ILogger`, or feature flags:

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
```

### Auto-Discovery

Policy providers are **automatically discovered** from your assemblies:

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddResilienceBehavior();
});

// Auto-discovers all IResiliencePolicyProvider<T> implementations
builder.Services.RegisterResiliencePoliciesFromAssemblyContaining<Program>();
```

The provider is registered with a default lifetime of `Scoped`. If your provider has no scoped dependencies, pass `ServiceLifetime.Singleton` for better performance:

```csharp
builder.Services.RegisterResiliencePoliciesFromAssemblyContaining<Program>(
    lifetime: ServiceLifetime.Singleton);
```

:::tip Lifetime
`AddResiliencePolicyProvider` defaults to `Scoped`. If the provider has no scoped dependencies, pass `ServiceLifetime.Singleton` for better performance.
:::

:::note Policy caching (v1.2.2+)
`GetPolicy()` is called **once** per request type and the result is cached for the lifetime of the application. The provider lifetime only affects how the provider itself is resolved for that first call — subsequent requests use the cached policy directly.
:::

:::tip Testing auto-discovery (v1.2.4+)
`RegisterResiliencePoliciesFromAssembly` and `RegisterResiliencePoliciesFromAssemblyContaining<T>` are fully covered by unit tests. You can verify discovery in your own tests by calling these methods with `typeof(YourMarker).Assembly` and resolving `IResiliencePolicyProvider<T>` from the built `ServiceProvider`.

```csharp
var services = new ServiceCollection();
services.RegisterResiliencePoliciesFromAssembly(typeof(MyMarker).Assembly);
var provider = services.BuildServiceProvider();

var policyProvider = provider.GetService<IResiliencePolicyProvider<MyRequest>>();
Assert.NotNull(policyProvider);
```
:::

---

## Global Policy

A global policy is the fallback for every request that has no specific provider:

```csharp
// Fixed policy for everything
services.AddGlobalResiliencePolicy(
    ResiliencePolicy.Create()
        .Retry(3)
        .Timeout(TimeSpan.FromSeconds(30))
        .Build());
```

The factory overload receives the raw request object, useful for differentiating by request type:

```csharp
services.AddGlobalResiliencePolicy(req =>
    ResiliencePolicy.Create()
        .Retry(req is IQuery ? 3 : 1)
        .Timeout(TimeSpan.FromSeconds(30))
        .Build());
```

:::note
The global policy uses `AddSingleton` internally — the factory is called once per unique request type (not per request instance).
:::

---

## Full Setup Example

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddResilienceBehavior();
});

// Global baseline: retry + timeout for everything
builder.Services.AddGlobalResiliencePolicy(
    ResiliencePolicy.Create()
        .Retry(3)
        .Timeout(TimeSpan.FromSeconds(30))
        .Build());

// Login: rate limit per user (overrides global)
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

// Payment: circuit breaker via class (needs IOptions)
builder.Services.AddResiliencePolicyProvider<PlaceOrderCommand, PlaceOrderPolicyProvider>();
```
