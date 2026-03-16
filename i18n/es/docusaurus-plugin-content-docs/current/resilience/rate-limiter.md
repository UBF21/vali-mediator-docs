---
id: rate-limiter
title: Limitador de Tasa
---

# Limitador de Tasa (Rate Limiter)

La política de limitador de tasa controla cuántas solicitudes pueden realizarse dentro de una ventana de tiempo, protegiendo los servicios downstream de ser sobrecargados.

## Algoritmos

| Algoritmo | Descripción |
|-----------|-------------|
| `TokenBucket` | Un cubo se llena con tokens con el tiempo; cada solicitud consume un token |
| `SlidingWindow` | Cuenta solicitudes en una ventana de tiempo deslizante |

## Token Bucket

```csharp
var policy = ResiliencePolicy.Create()
    .RateLimiter(opts =>
    {
        opts.Algorithm = RateLimiterAlgorithm.TokenBucket;
        opts.BucketCapacity = 100;                           // máx. burst
        opts.TokensPerInterval = 10;                          // tasa de reposición
        opts.ReplenishmentInterval = TimeSpan.FromSeconds(1); // cada segundo
    })
    .Build();
```

**Atajo** (usa token bucket con valores por defecto):

```csharp
var policy = ResiliencePolicy.Create()
    .RateLimiter(bucketCapacity: 100)
    .Build();
```

## Sliding Window

```csharp
var policy = ResiliencePolicy.Create()
    .RateLimiter(opts =>
    {
        opts.Algorithm = RateLimiterAlgorithm.SlidingWindow;
        opts.PermitLimit = 100;                  // máx. solicitudes por ventana
        opts.Window = TimeSpan.FromMinutes(1);   // duración de la ventana
    })
    .Build();
```

## Manejo de Rechazo

```csharp
try
{
    var result = await policy.ExecuteAsync<string>(async ct =>
        await _api.CallAsync(ct));
}
catch (RateLimitExceededException ex)
{
    _logger.LogWarning("Límite de tasa excedido (Algoritmo: {Algorithm})", ex.Algorithm);
    return Results.StatusCode(429);
}
```

## Casos de Uso

```csharp
// API de GitHub: 5000 solicitudes/hora
var githubPolicy = ResiliencePolicy.Create()
    .RateLimiter(opts =>
    {
        opts.Algorithm = RateLimiterAlgorithm.SlidingWindow;
        opts.PermitLimit = 5000;
        opts.Window = TimeSpan.FromHours(1);
    })
    .Build();
```
