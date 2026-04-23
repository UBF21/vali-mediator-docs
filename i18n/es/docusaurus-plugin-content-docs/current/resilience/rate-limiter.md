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

---

## Rate Limiting Particionado (por usuario / IP)

Por defecto el rate limiter cuenta todas las llamadas a un tipo de comando en conjunto. Si el Usuario A hace 8 requests y el Usuario B hace 3, la llamada número 11 falla — sin importar quién la generó.

Usá `PartitionKeyResolver` para darle a cada usuario su propio contador independiente:

```csharp
services.AddResiliencePolicy<LoginCommand>(req =>
    ResiliencePolicy.Create()
        .RateLimiter(opts =>
        {
            opts.Algorithm = RateLimiterAlgorithm.SlidingWindow;
            opts.PermitLimit = 5;
            opts.Window = TimeSpan.FromMinutes(1);
            // cada email tiene su propio contador
            opts.PartitionKeyResolver = r => ((LoginCommand)r).Email;
        })
        .Build());
```

Con un resolver configurado:
- Usuario A alcanza su límite → bloqueado
- Usuario B no se ve afectado y puede seguir haciendo requests

### Ejemplos de clave de partición

```csharp
// Por ID de usuario
opts.PartitionKeyResolver = r => ((MyCommand)r).UserId;

// Por IP (cuando la IP es parte del comando)
opts.PartitionKeyResolver = r => ((MyCommand)r).ClientIp;

// Por tenant
opts.PartitionKeyResolver = r => ((MyCommand)r).TenantId;
```

:::note
`PartitionKeyResolver` requiere que el request sea despachado a través de `ResilienceBehavior` (integración estándar con Vali-Mediator). Cada clave única crea una instancia independiente de `RateLimiterState` gestionada internamente.
:::
