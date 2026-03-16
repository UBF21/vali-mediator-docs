---
id: installation
title: Installation
---

# Installation

## Prerequisites

- .NET 7.0, 8.0, or 9.0
- `Microsoft.Extensions.DependencyInjection` (already included transitively)

## Core Package

Install the core package to get started:

```bash
dotnet add package Vali-Mediator
```

Or via `PackageReference` in your `.csproj`:

```xml
<PackageReference Include="Vali-Mediator" Version="2.0.0" />
```

## Extension Packages

Install only the packages you need:

```bash
# ASP.NET Core integration (Result → HTTP responses)
dotnet add package Vali-Mediator.AspNetCore

# Resilience policies (Retry, Circuit Breaker, Timeout, etc.)
dotnet add package Vali-Mediator.Resilience

# Pipeline caching
dotnet add package Vali-Mediator.Caching

# OpenTelemetry-compatible observability
dotnet add package Vali-Mediator.Observability

# Idempotent request deduplication
dotnet add package Vali-Mediator.Idempotency
```

Or via PackageReference:

```xml
<ItemGroup>
  <PackageReference Include="Vali-Mediator" Version="2.0.0" />
  <PackageReference Include="Vali-Mediator.AspNetCore" Version="2.0.0" />
  <PackageReference Include="Vali-Mediator.Resilience" Version="2.0.0" />
  <PackageReference Include="Vali-Mediator.Caching" Version="2.0.0" />
  <PackageReference Include="Vali-Mediator.Observability" Version="2.0.0" />
  <PackageReference Include="Vali-Mediator.Idempotency" Version="2.0.0" />
</ItemGroup>
```

## Basic Setup

Register Vali-Mediator in your DI container:

```csharp
// Program.cs
builder.Services.AddValiMediator(config =>
{
    // Scan the assembly containing Program for handlers, processors, etc.
    config.RegisterServicesFromAssemblyContaining<Program>();
});
```

That's it — Vali-Mediator will automatically discover all handlers, pre/post processors, and register them.

## Full Setup (All Packages)

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Add behaviors (first registered = outermost in pipeline)
    config.AddCachingBehavior();
    config.AddObservabilityBehavior();
    config.AddIdempotencyBehavior();
    config.AddResilienceBehavior();
});

// Register stores
builder.Services.AddInMemoryCacheStore();
builder.Services.AddInMemoryIdempotencyStore();

// Observability
builder.Services.AddObservability();

// Timeout behavior (IHasTimeout support)
builder.Services.AddTimeoutBehavior();

// Dead letter queue for failed ResilientParallel notifications
builder.Services.AddInMemoryDeadLetterQueue();
```

:::tip
For production use, replace in-memory stores with distributed implementations (Redis, SQL Server, etc.).
:::
