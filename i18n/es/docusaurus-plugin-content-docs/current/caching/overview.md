---
id: overview
title: Resumen de Caché
---

import Drawio from '@theme/Drawio';
import cachingOverview from '@site/static/diagrams/caching-overview.drawio';

# Caché

`Vali-Mediator.Caching` agrega caché declarativa en el pipeline a cualquier `IRequest<T>` sin modificar el código del handler — incluye coalescing automático de misses concurrentes, así una estampida de requests idénticos ejecuta el handler una sola vez.

## Instalación

```bash
dotnet add package Vali-Mediator.Caching
```

## Configuración

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddCachingBehavior();
});

builder.Services.AddInMemoryCacheStore();
```

## Cómo Funciona

<Drawio content={cachingOverview} />

## Ejemplo Rápido

```csharp
public record GetProductQuery(Guid Id)
    : IRequest<Result<ProductDto>>, ICacheable
{
    public string CacheKey => $"product:{Id}";
    public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(10);
    public TimeSpan? SlidingExpiration => null;
    public string? CacheGroup => "products";
    public bool BypassCache => false;
    public CacheOrder Order => CacheOrder.ReadThenWrite;
}
```

El handler no necesita cambios — la caché se aplica transparentemente por el pipeline behavior.

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| `ICacheable` | Marca una solicitud como cacheable; provee clave de caché y expiración |
| `IInvalidatesCache` | Marca una solicitud que invalida entradas cacheadas |
| `ICacheStore` | Abstracción del backend de caché (en memoria, Redis, etc.) |
| `CacheOrder` | Controla check-then-store vs store-only vs check-only |
| `CacheGroup` | Agrupa entradas de caché relacionadas para invalidación masiva |

## Coalescing de Misses Concurrentes

Cuando varios requests piden la misma clave de caché al mismo tiempo y es un miss, solo el primero ejecuta el handler — el resto espera ese mismo resultado en vuelo en lugar de golpear cada uno el backing store (y, transitivamente, la base de datos). Esto es automático con `AddCachingBehavior()` registrado; la única perilla es cuánto espera un seguidor antes de desistir y correr el handler por su cuenta:

```csharp
builder.Services.AddCachingOptions(options =>
{
    options.CoalescingWaitTimeout = TimeSpan.FromSeconds(30); // limita el daño de un handler colgado
});
```

## Límites del Store en Memoria

Todo límite se valida (debe ser mayor a cero) y acota la memoria incluso cuando las claves/grupos vienen de input controlado por el cliente — una clave sobredimensionada o un grupo que supera el límite se descarta en lugar de aceptarse:

```csharp
builder.Services.AddInMemoryCacheStore(options =>
{
    options.MaxEntries = 10_000;             // se expulsa la entrada menos usada recientemente al llenarse
    options.MaxKeyLength = 512;              // claves/nombres de grupo más largos nunca se almacenan
    options.MaxGroups = 10_000;              // grupos distintos indexados a la vez
    options.MaxKeysPerGroup = 10_000;        // claves indexadas bajo un grupo
    options.CleanupInterval = TimeSpan.FromMinutes(5);
});
```
