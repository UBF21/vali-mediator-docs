---
id: dependency-injection
title: Dependency Injection
---

# Dependency Injection

Full reference for registering Vali-Mediator and all extension packages.

## Core Registration

```csharp
builder.Services.AddValiMediator(config =>
{
    // Scan assembly for handlers, processors, and notification handlers
    config.RegisterServicesFromAssemblyContaining<Program>();
});
```

## Multi-Assembly Registration

```csharp
builder.Services.AddValiMediator(config =>
{
    // Application layer
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Domain layer (with Transient lifetime)
    config.RegisterServicesFromAssembly(
        typeof(Domain.Marker).Assembly,
        ServiceLifetime.Transient);

    // Infrastructure layer (with Singleton lifetime for expensive setup)
    config.RegisterServicesFromAssembly(
        typeof(Infrastructure.Marker).Assembly,
        ServiceLifetime.Singleton);
});
```

## Service Lifetimes

The default lifetime for all handlers is **Scoped**. Override per assembly:

| Lifetime | When to use |
|----------|-------------|
| `Scoped` (default) | Most handlers — scoped to HTTP request |
| `Transient` | Handlers with no shared state |
| `Singleton` | Handlers with thread-safe, expensive initialization |

## Behavior Registration

Behaviors execute in the order registered. **First registered = outermost** (runs first before handler, last after).

```csharp
config.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Order matters — these wrap from outside in:
    config.AddObservabilityBehavior();          // 1st: outermost
    config.AddCachingBehavior();               // 2nd
    config.AddIdempotencyBehavior();           // 3rd
    config.AddResilienceBehavior();            // 4th: innermost before handler

    // Shorthand for typed behaviors
    config.AddRequestBehavior<LoggingBehavior<MyRequest, MyResponse>>();
    config.AddDispatchBehavior<NotificationBehavior<MyNotification>>();

    // Open generic
    config.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
});
```

## All Extension Methods Reference

### Core

```csharp
// AddValiMediator — core registration
builder.Services.AddValiMediator(config => { ... });

// Timeout behavior for IHasTimeout requests
builder.Services.AddTimeoutBehavior();

// Dead letter queue for ResilientParallel publish failures
builder.Services.AddInMemoryDeadLetterQueue();
```

### Resilience

```csharp
// Enable ResilienceBehavior for IResilient handlers
config.AddResilienceBehavior();
```

### Caching

```csharp
// Enable CachingBehavior + CacheInvalidationBehavior
config.AddCachingBehavior();

// Register in-memory cache store
builder.Services.AddInMemoryCacheStore();

// Or custom store
builder.Services.AddSingleton<ICacheStore, RedisCacheStore>();
```

### Observability

```csharp
// Register ActivitySource, default metrics collector, and observers DI
builder.Services.AddObservability();

// Enable ObservabilityBehavior in pipeline
config.AddObservabilityBehavior();

// Register custom metrics collector
builder.Services.AddSingleton<IMetricsCollector, PrometheusMetricsCollector>();

// Register observers
builder.Services.AddTransient<IRequestObserver, LoggingObserver>();
```

### Idempotency

```csharp
// Enable IdempotencyBehavior in pipeline
config.AddIdempotencyBehavior();

// Register in-memory idempotency store
builder.Services.AddInMemoryIdempotencyStore();

// Or custom store
builder.Services.AddSingleton<IIdempotencyStore, RedisIdempotencyStore>();
```

## Complete Production Setup

```csharp
// Program.cs
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.RegisterServicesFromAssembly(typeof(Infrastructure.Marker).Assembly);

    // Behaviors — outermost first
    config.AddObservabilityBehavior();
    config.AddCachingBehavior();
    config.AddIdempotencyBehavior();
    config.AddResilienceBehavior();
});

// Timeout behavior
builder.Services.AddTimeoutBehavior();

// Dead letter queue
builder.Services.AddInMemoryDeadLetterQueue();

// Observability
builder.Services.AddObservability();
builder.Services.AddSingleton<IMetricsCollector, PrometheusMetricsCollector>();
builder.Services.AddTransient<IRequestObserver, LoggingObserver>();

// Caching (Redis in production)
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"]!));
builder.Services.AddSingleton<ICacheStore, RedisCacheStore>();

// Idempotency (Redis in production)
builder.Services.AddSingleton<IIdempotencyStore, RedisIdempotencyStore>();

// OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t
        .AddSource("Vali-Mediator")
        .AddOtlpExporter());
```
