---
id: bulkhead
title: Bulkhead (Límite de Concurrencia)
---

# Bulkhead (Límite de Concurrencia)

La política bulkhead limita el número de ejecuciones concurrentes y opcionalmente pone en cola las solicitudes excedentes. Previene que una sola dependencia consuma todos los recursos disponibles.

## Uso Básico

```csharp
var policy = ResiliencePolicy.Create()
    .Bulkhead(maxConcurrent: 10, maxQueued: 20)
    .Build();
```

## Opciones de Configuración

```csharp
var policy = ResiliencePolicy.Create()
    .Bulkhead(opts =>
    {
        opts.MaxConcurrency = 10;           // máx. ejecuciones paralelas
        opts.MaxQueueSize = 50;             // máx. solicitudes en cola
        opts.QueueTimeout = TimeSpan.FromSeconds(5); // tiempo de espera en cola
        opts.OnRejected = context =>
        {
            _logger.LogWarning("Bulkhead rechazó solicitud — sistema al máximo de capacidad");
            return Task.CompletedTask;
        };
    })
    .Build();
```

## Manejo de Rechazo

Cuando el bulkhead está lleno, lanza `BulkheadRejectedException`:

```csharp
try
{
    var result = await policy.ExecuteAsync<string>(async ct =>
    {
        return await _expensiveOperation.RunAsync(ct);
    });
}
catch (BulkheadRejectedException ex)
{
    // Retornar 429 o encolar en trabajo en segundo plano
    return Results.StatusCode(429);
}
```

## Casos de Uso

```csharp
// Limitar llamadas al servicio de pagos a 5 concurrentes
var paymentPolicy = ResiliencePolicy.Create()
    .Bulkhead(maxConcurrent: 5, maxQueued: 10)
    .Timeout(TimeSpan.FromSeconds(30))
    .Build();

// No exceder el pool de conexiones de la base de datos
var dbPolicy = ResiliencePolicy.Create()
    .Bulkhead(opts =>
    {
        opts.MaxConcurrency = 20; // igual al tamaño del pool
        opts.MaxQueueSize = 100;
    })
    .Build();
```
