---
id: dependency-injection
title: Inyección de Dependencias
---

# Inyección de Dependencias

Referencia completa para registrar Vali-Mediator y todos los paquetes de extensión.

## Registro Core

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
});
```

## Registro Multi-Assembly

```csharp
builder.Services.AddValiMediator(config =>
{
    // Capa de aplicación
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Capa de dominio (con lifetime Transient)
    config.RegisterServicesFromAssembly(
        typeof(Domain.Marker).Assembly,
        ServiceLifetime.Transient);

    // Capa de infraestructura
    config.RegisterServicesFromAssembly(
        typeof(Infrastructure.Marker).Assembly,
        ServiceLifetime.Singleton);
});
```

## Lifetimes de Servicio

| Lifetime | Cuándo usar |
|----------|-------------|
| `Scoped` (por defecto) | La mayoría de handlers — con scope al request HTTP |
| `Transient` | Handlers sin estado compartido |
| `Singleton` | Handlers con inicialización costosa y thread-safe |

## Registro de Behaviors

Los behaviors se ejecutan en el orden registrado. **Primero registrado = más externo**.

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Orden importa — envuelven de afuera hacia adentro:
    config.AddObservabilityBehavior();     // 1ro: más externo
    config.AddCachingBehavior();           // 2do
    config.AddIdempotencyBehavior();       // 3ro
    config.AddResilienceBehavior();        // 4to: más interno antes del handler
});
```

## Referencia de Todos los Métodos de Extensión

### Core

```csharp
builder.Services.AddValiMediator(config => { ... });
builder.Services.AddTimeoutBehavior();
builder.Services.AddInMemoryDeadLetterQueue();
```

### Resiliencia

```csharp
config.AddResilienceBehavior();
```

### Caché

```csharp
config.AddCachingBehavior();
builder.Services.AddInMemoryCacheStore();
builder.Services.AddSingleton<ICacheStore, RedisCacheStore>();
```

### Observabilidad

```csharp
builder.Services.AddObservability();
config.AddObservabilityBehavior();
builder.Services.AddSingleton<IMetricsCollector, PrometheusMetricsCollector>();
builder.Services.AddTransient<IRequestObserver, LoggingObserver>();
```

### Idempotencia

```csharp
config.AddIdempotencyBehavior();
builder.Services.AddInMemoryIdempotencyStore();
builder.Services.AddSingleton<IIdempotencyStore, RedisIdempotencyStore>();
```

## Configuración Completa de Producción

```csharp
// Program.cs
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.RegisterServicesFromAssembly(typeof(Infrastructure.Marker).Assembly);

    // Behaviors — más externo primero
    config.AddObservabilityBehavior();
    config.AddCachingBehavior();
    config.AddIdempotencyBehavior();
    config.AddResilienceBehavior();
});

builder.Services.AddTimeoutBehavior();
builder.Services.AddInMemoryDeadLetterQueue();
builder.Services.AddObservability();
builder.Services.AddSingleton<IMetricsCollector, PrometheusMetricsCollector>();
builder.Services.AddTransient<IRequestObserver, LoggingObserver>();

// Caché (Redis en producción)
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"]!));
builder.Services.AddSingleton<ICacheStore, RedisCacheStore>();

// Idempotencia (Redis en producción)
builder.Services.AddSingleton<IIdempotencyStore, RedisIdempotencyStore>();

// OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t
        .AddSource("Vali-Mediator")
        .AddOtlpExporter());
```
