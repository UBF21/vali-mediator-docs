---
id: observers
title: Observadores de Solicitudes
---

# Observadores de Solicitudes

`IRequestObserver` se conecta al ciclo de vida de la solicitud — iniciado, completado y fallido — sin modificar el código del handler.

## Interfaz

```csharp
public interface IRequestObserver
{
    Task OnStarted(ObservabilityContext context, CancellationToken ct);
    Task OnCompleted(ObservabilityContext context, CancellationToken ct);
    Task OnFailed(ObservabilityContext context, CancellationToken ct);
}
```

## Implementar un Observador

### Observador de Logging

```csharp
public class LoggingObserver : IRequestObserver
{
    private readonly ILogger<LoggingObserver> _logger;

    public LoggingObserver(ILogger<LoggingObserver> logger)
    {
        _logger = logger;
    }

    public Task OnStarted(ObservabilityContext context, CancellationToken ct)
    {
        _logger.LogDebug("Iniciando {Request} [{OperationId}]",
            context.RequestName, context.OperationId);
        return Task.CompletedTask;
    }

    public Task OnCompleted(ObservabilityContext context, CancellationToken ct)
    {
        _logger.LogInformation(
            "Completado {Request} en {Duration}ms [{OperationId}]",
            context.RequestName,
            context.Duration.TotalMilliseconds,
            context.OperationId);
        return Task.CompletedTask;
    }

    public Task OnFailed(ObservabilityContext context, CancellationToken ct)
    {
        _logger.LogError(context.Exception,
            "Falló {Request} después de {Duration}ms [{OperationId}]",
            context.RequestName,
            context.Duration.TotalMilliseconds,
            context.OperationId);
        return Task.CompletedTask;
    }
}
```

## Registro

Múltiples observadores pueden registrarse — todos se ejecutan para cada solicitud:

```csharp
builder.Services.AddObservability();
builder.Services.AddTransient<IRequestObserver, LoggingObserver>();
builder.Services.AddTransient<IRequestObserver, SlowRequestAlertObserver>();
```

:::note
Si un observador lanza una excepción, los demás igualmente se ejecutan. Todas las excepciones se recopilan en un `AggregateException`. Diseña los observadores para ser resilientes — envuelve su lógica en try/catch si llaman a sistemas externos.
:::
