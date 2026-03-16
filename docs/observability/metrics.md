---
id: metrics
title: Metrics
---

# Metrics

`IMetricsCollector` records per-request metrics: duration, success/failure counts, and error types.

## Built-in Implementations

| Implementation | Description |
|---------------|-------------|
| `NoOpMetricsCollector` | Does nothing — default if no collector registered |
| `ConsoleMetricsCollector` | Prints metrics to stdout — useful for development |

## Using ConsoleMetricsCollector

```csharp
builder.Services.AddObservability(config =>
{
    config.UseMetricsCollector<ConsoleMetricsCollector>();
});
```

## Custom IMetricsCollector

Implement `IMetricsCollector` to integrate with Prometheus, Application Insights, or any other metrics system:

```csharp
public class PrometheusMetricsCollector : IMetricsCollector
{
    private static readonly Counter RequestsTotal = Metrics.CreateCounter(
        "mediator_requests_total",
        "Total mediator requests",
        new CounterConfiguration { LabelNames = new[] { "handler", "success" } });

    private static readonly Histogram RequestDuration = Metrics.CreateHistogram(
        "mediator_request_duration_seconds",
        "Mediator request duration",
        new HistogramConfiguration { LabelNames = new[] { "handler" } });

    public void RecordRequestStarted(string requestName)
    {
        // Optionally track in-flight requests
    }

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

## Registration

```csharp
// Register custom collector
builder.Services.AddSingleton<IMetricsCollector, PrometheusMetricsCollector>();

// Or via AddObservability config
builder.Services.AddObservability(config =>
{
    config.UseMetricsCollector<PrometheusMetricsCollector>();
});
```

## Application Insights Example

```csharp
public class AppInsightsMetricsCollector : IMetricsCollector
{
    private readonly TelemetryClient _client;

    public AppInsightsMetricsCollector(TelemetryClient client)
    {
        _client = client;
    }

    public void RecordRequestStarted(string requestName) { }

    public void RecordRequestCompleted(string requestName, TimeSpan duration, bool success, string? errorType)
    {
        _client.TrackDependency(
            dependencyTypeName: "Mediator",
            dependencyName: requestName,
            data: requestName,
            startTime: DateTimeOffset.UtcNow - duration,
            duration: duration,
            success: success);
    }

    public void RecordRequestFailed(string requestName, TimeSpan duration, Exception exception)
    {
        _client.TrackException(exception, new Dictionary<string, string>
        {
            { "handler", requestName }
        });
    }
}
```
