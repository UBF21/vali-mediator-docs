---
id: metrics
title: Métricas
---

# Métricas

`IMetricsCollector` registra métricas por solicitud: duración, conteos de éxito/fallo y tipos de error.

## Implementaciones Built-in

| Implementación | Descripción |
|---------------|-------------|
| `NoOpMetricsCollector` | No hace nada — por defecto si no se registra collector |
| `ConsoleMetricsCollector` | Imprime métricas en stdout — útil para desarrollo |

## IMetricsCollector Personalizado

```csharp
public class PrometheusMetricsCollector : IMetricsCollector
{
    private static readonly Counter RequestsTotal = Metrics.CreateCounter(
        "mediator_requests_total",
        "Total solicitudes del mediador",
        new CounterConfiguration { LabelNames = new[] { "handler", "success" } });

    private static readonly Histogram RequestDuration = Metrics.CreateHistogram(
        "mediator_request_duration_seconds",
        "Duración de solicitudes del mediador",
        new HistogramConfiguration { LabelNames = new[] { "handler" } });

    public void RecordRequestStarted(string requestName) { }

    public void RecordRequestCompleted(string requestName, TimeSpan duration, bool success, string? errorType)
    {
        RequestsTotal.WithLabels(requestName, success.ToString()).Inc();
        RequestDuration.WithLabels(requestName).Observe(duration.TotalSeconds);
    }

    public void RecordRequestFailed(string requestName, TimeSpan duration, Exception exception)
    {
        RequestsTotal.WithLabels(requestName, "false").Inc();
        RequestDuration.WithLabels(requestName).Observe(duration.TotalSeconds);
    }
}
```

## Registro

```csharp
builder.Services.AddSingleton<IMetricsCollector, PrometheusMetricsCollector>();
```
