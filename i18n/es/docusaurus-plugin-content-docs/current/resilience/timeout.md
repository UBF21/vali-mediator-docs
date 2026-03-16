---
id: timeout
title: Política de Timeout
---

# Política de Timeout (Resiliencia)

La política de timeout de resiliencia cancela una operación si tarda más que la duración configurada.

## Uso Básico

```csharp
var policy = ResiliencePolicy.Create()
    .Timeout(TimeSpan.FromSeconds(5))
    .Build();
```

## Opciones de Configuración

```csharp
var policy = ResiliencePolicy.Create()
    .Timeout(opts =>
    {
        opts.Timeout = TimeSpan.FromSeconds(10);
        opts.Strategy = TimeoutStrategy.Optimistic; // o Pessimistic
        opts.OnTimeout = context =>
        {
            _logger.LogWarning("Operación agotó el tiempo después de {Duration}", context.Timeout);
            return Task.CompletedTask;
        };
    })
    .Build();
```

## Estrategias de Timeout

### Optimistic (Por Defecto)

Depende de que la operación **observe el CancellationToken**. El token se cancela después del timeout.

```csharp
// Funciona bien — HttpClient respeta la cancelación
await _httpClient.GetStringAsync(url, ct);
```

### Pessimistic

Termina forzosamente la operación ejecutándola en un hilo secundario y abandonándola cuando dispara el timeout. Úsalo para operaciones que **no** aceptan o respetan `CancellationToken`.

:::warning
Con la estrategia **Pessimistic**, la operación abandonada continúa ejecutándose en segundo plano. Puede causar fugas de recursos. Úsala con precaución.
:::

## Combinado con Retry

Cuando se combina con Retry, el timeout aplica **por intento** (no total):

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(3)
    .Timeout(TimeSpan.FromSeconds(5)) // 5s por intento, no 15s total
    .Build();
```
