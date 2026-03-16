---
id: retry
title: Política de Reintentos
---

# Política de Reintentos

La política de reintentos re-ejecuta automáticamente una operación fallida hasta un número configurado de veces.

## Uso Básico

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(3) // reintentar hasta 3 veces
    .Build();
```

## Opciones de Configuración

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 3;
        opts.BackoffType = BackoffType.Exponential; // Constant, Linear, Exponential
        opts.DelayMs = 200;                          // retardo base en ms
        opts.OnRetry = context =>
        {
            Console.WriteLine($"Reintento #{context.AttemptNumber}: {context.Exception?.Message}");
            return Task.CompletedTask;
        };
    })
    .Build();
```

## Tipos de Backoff

| BackoffType | Fórmula de Retardo | Ejemplo (DelayMs=200) |
|------------|---------------------|----------------------|
| `Constant` | `DelayMs` siempre | 200ms, 200ms, 200ms |
| `Linear` | `DelayMs × intento` | 200ms, 400ms, 600ms |
| `Exponential` | `DelayMs × 2^intento` + jitter | ~200ms, ~400ms, ~800ms |

## Reintentar en Excepciones Específicas

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 3;
        // Solo reintentar en estos tipos de excepción
        opts.RetryOnExceptions = new[]
        {
            typeof(HttpRequestException),
            typeof(TimeoutException)
        };
    })
    .Build();
```

## Reintentar en Tipos de Error de Result

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 2;
        // Reintentar si el Result falla con estos tipos de error
        opts.RetryOnErrorTypes = new[] { ErrorType.Failure };
    })
    .Build();
```

## Callback OnRetry

```csharp
.Retry(opts =>
{
    opts.MaxRetries = 3;
    opts.OnRetry = context =>
    {
        _logger.LogWarning(
            "Intento de reintento {Attempt}/{Max}: {Error}",
            context.AttemptNumber,
            context.MaxAttempts,
            context.Exception?.Message ?? context.Result?.ToString());
        return Task.CompletedTask;
    };
})
```
