---
id: tracing
title: Distributed Tracing
---

# Distributed Tracing

Vali-Mediator creates an `Activity` (OpenTelemetry span) for each request, notification, and fire-and-forget command.

## ActivitySource

```csharp
// Access the source directly
var source = ValiMediatorDiagnostics.ActivitySource;
// Name: "Vali-Mediator"
// Version: "2.0.0"
```

## OpenTelemetry Setup

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .SetResourceBuilder(ResourceBuilder.CreateDefault()
                .AddService("MyApp", serviceVersion: "1.0.0"))
            // Listen to Vali-Mediator spans
            .AddSource("Vali-Mediator")
            // Also listen to your own spans
            .AddSource("MyApp.*")
            // Export to Jaeger
            .AddJaegerExporter(opts =>
            {
                opts.AgentHost = "localhost";
                opts.AgentPort = 6831;
            })
            // Or to Zipkin
            .AddZipkinExporter(opts =>
            {
                opts.Endpoint = new Uri("http://localhost:9411/api/v2/spans");
            })
            // Or to OTLP (Grafana, Tempo, etc.)
            .AddOtlpExporter();
    });
```

## Activity Tags

Each request activity includes these tags:

| Tag | Value |
|-----|-------|
| `mediator.request.type` | Full type name of the request |
| `mediator.handler.type` | Full type name of the handler |
| `mediator.request.success` | `true` / `false` |
| `mediator.request.error_type` | `ErrorType` value (if failed) |
| `mediator.request.duration_ms` | Duration in milliseconds |

## Creating Child Activities

From within a handler, create child spans that nest under the Vali-Mediator span:

```csharp
public class GetProductHandler : IRequestHandler<GetProductQuery, Result<ProductDto>>
{
    private static readonly ActivitySource Source = new("MyApp.Handlers");

    public async Task<Result<ProductDto>> Handle(GetProductQuery req, CancellationToken ct)
    {
        using var activity = Source.StartActivity("GetProduct.DatabaseQuery");
        activity?.SetTag("product.id", req.ProductId.ToString());

        var product = await _repository.GetByIdAsync(req.ProductId, ct);

        activity?.SetTag("product.found", product is not null);

        if (product is null)
            return Result<ProductDto>.Fail("Not found.", ErrorType.NotFound);

        return Result<ProductDto>.Ok(product.ToDto());
    }
}
```

## Aspire Dashboard

For local development, use the .NET Aspire Dashboard for a zero-config trace viewer:

```csharp
// OTLP exporter to Aspire Dashboard
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("Vali-Mediator")
        .AddOtlpExporter(opts =>
        {
            opts.Endpoint = new Uri("http://localhost:4317");
        }));
```
