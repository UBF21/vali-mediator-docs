---
id: installation
title: Instalación
---

# Instalación

## Prerrequisitos

- .NET 7.0, 8.0 o 9.0
- `Microsoft.Extensions.DependencyInjection` (incluido transitivamente)

## Paquete Core

```bash
dotnet add package Vali-Mediator
```

O mediante `PackageReference`:

```xml
<PackageReference Include="Vali-Mediator" Version="2.0.0" />
```

## Paquetes de Extensión

```bash
# Integración ASP.NET Core (Result → respuestas HTTP)
dotnet add package Vali-Mediator.AspNetCore

# Políticas de resiliencia (Retry, Circuit Breaker, Timeout, etc.)
dotnet add package Vali-Mediator.Resilience

# Caché en el pipeline
dotnet add package Vali-Mediator.Caching

# Observabilidad compatible con OpenTelemetry
dotnet add package Vali-Mediator.Observability

# Deduplicación de solicitudes idempotentes
dotnet add package Vali-Mediator.Idempotency
```

## Configuración Básica

Registra Vali-Mediator en el contenedor DI:

```csharp
// Program.cs
builder.Services.AddValiMediator(config =>
{
    // Escanea el assembly que contiene Program en busca de handlers, procesadores, etc.
    config.RegisterServicesFromAssemblyContaining<Program>();
});
```

## Configuración Completa (Todos los Paquetes)

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Agrega behaviors (primero registrado = más externo en el pipeline)
    config.AddCachingBehavior();
    config.AddObservabilityBehavior();
    config.AddIdempotencyBehavior();
    config.AddResilienceBehavior();
});

// Registrar stores
builder.Services.AddInMemoryCacheStore();
builder.Services.AddInMemoryIdempotencyStore();

// Observabilidad
builder.Services.AddObservability();

// Behavior de timeout (soporte IHasTimeout)
builder.Services.AddTimeoutBehavior();

// Cola de mensajes muertos para notificaciones ResilientParallel fallidas
builder.Services.AddInMemoryDeadLetterQueue();
```

:::tip
Para uso en producción, reemplaza los stores en memoria con implementaciones distribuidas (Redis, SQL Server, etc.).
:::
