---
id: overview
title: Resumen de Observabilidad
---

# Observabilidad

`Vali-Mediator.Observability` agrega telemetría a cada solicitud manejada por el mediador — trazado distribuido, métricas y observadores personalizados.

## Instalación

```bash
dotnet add package Vali-Mediator.Observability
```

## Configuración

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddObservabilityBehavior();
});

builder.Services.AddObservability();
```

## Los Tres Pilares

| Pilar | Tipo | Descripción |
|-------|------|-------------|
| Trazado | `ValiMediatorDiagnostics.ActivitySource` | Activity de OpenTelemetry por solicitud |
| Métricas | `IMetricsCollector` | Registra duración, conteos de éxito/fallo |
| Observadores | `IRequestObserver` | Hooks en el ciclo de vida iniciado/completado/fallido |

## Qué se Registra

Para cada `IRequest<T>`, `INotification` e `IFireAndForget` procesado:
- **Activity iniciado** con nombre del tipo de solicitud
- **Nombre del handler** como tag en el activity
- **Duración** en milisegundos
- **Estado de éxito/fallo**
- **ErrorType** si aplica

## Integración con OpenTelemetry

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("Vali-Mediator") // escuchar activities de Vali-Mediator
        .AddJaegerExporter()
        .AddZipkinExporter());
```
