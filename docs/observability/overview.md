---
id: overview
title: Observability Overview
---

# Observability

`Vali-Mediator.Observability` adds telemetry to every request handled by the mediator — distributed tracing, metrics, and custom observers.

## Installation

```bash
dotnet add package Vali-Mediator.Observability
```

## Setup

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddObservabilityBehavior();
});

builder.Services.AddObservability();
```

## Three Pillars

| Pillar | Type | Description |
|--------|------|-------------|
| Tracing | `ValiMediatorDiagnostics.ActivitySource` | OpenTelemetry-compatible Activity per request |
| Metrics | `IMetricsCollector` | Record duration, success/failure counts |
| Observers | `IRequestObserver` | Hook into started/completed/failed lifecycle |

## What Gets Recorded

For every `IRequest<T>`, `INotification`, and `IFireAndForget` processed:
- **Activity started** with request type name
- **Handler name** tagged on the activity
- **Duration** in milliseconds
- **Success/failure** status
- **ErrorType** if applicable

## OpenTelemetry Integration

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("Vali-Mediator") // listen to Vali-Mediator activities
        .AddJaegerExporter()
        .AddZipkinExporter());
```

## Disabling for Specific Requests

To opt out of observability for a specific request, don't register `AddObservabilityBehavior` globally and instead apply it selectively, or implement a custom behavior that skips certain request types.
