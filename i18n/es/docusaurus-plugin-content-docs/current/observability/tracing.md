---
id: tracing
title: Trazado Distribuido
---

# Trazado Distribuido

Vali-Mediator crea un `Activity` (span de OpenTelemetry) para cada solicitud, notificación y comando fire-and-forget.

## ActivitySource

```csharp
// Acceder al source directamente
var source = ValiMediatorDiagnostics.ActivitySource;
// Nombre: "Vali-Mediator"
// Versión: "2.0.0"
```

## Configuración con OpenTelemetry

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .SetResourceBuilder(ResourceBuilder.CreateDefault()
                .AddService("MiApp", serviceVersion: "1.0.0"))
            // Escuchar spans de Vali-Mediator
            .AddSource("Vali-Mediator")
            // Exportar a Jaeger
            .AddJaegerExporter(opts =>
            {
                opts.AgentHost = "localhost";
                opts.AgentPort = 6831;
            })
            // O a Zipkin
            .AddZipkinExporter(opts =>
            {
                opts.Endpoint = new Uri("http://localhost:9411/api/v2/spans");
            })
            // O a OTLP (Grafana, Tempo, etc.)
            .AddOtlpExporter();
    });
```

## Tags del Activity

| Tag | Valor |
|-----|-------|
| `mediator.request.type` | Nombre completo del tipo de solicitud |
| `mediator.handler.type` | Nombre completo del tipo del handler |
| `mediator.request.success` | `true` / `false` |
| `mediator.request.error_type` | Valor de `ErrorType` (si falló) |
| `mediator.request.duration_ms` | Duración en milisegundos |

## Crear Activities Hijo

```csharp
public class GetProductHandler : IRequestHandler<GetProductQuery, Result<ProductDto>>
{
    private static readonly ActivitySource Source = new("MiApp.Handlers");

    public async Task<Result<ProductDto>> Handle(GetProductQuery req, CancellationToken ct)
    {
        using var activity = Source.StartActivity("GetProduct.ConsultaDB");
        activity?.SetTag("product.id", req.ProductId.ToString());

        var product = await _repository.GetByIdAsync(req.ProductId, ct);

        activity?.SetTag("product.found", product is not null);

        if (product is null)
            return Result<ProductDto>.Fail("No encontrado.", ErrorType.NotFound);

        return Result<ProductDto>.Ok(product.ToDto());
    }
}
```
