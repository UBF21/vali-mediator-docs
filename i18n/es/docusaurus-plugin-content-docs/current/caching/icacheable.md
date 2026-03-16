---
id: icacheable
title: Interfaz ICacheable
---

# Interfaz ICacheable

Implementa `ICacheable` en un `IRequest<T>` para hacerlo cacheable vía el pipeline behavior.

## Propiedades

### CacheKey

Identificador único de cadena para este valor cacheado. Diseña claves que sean:
- **Específicas** — incluye todos los parámetros que afectan el resultado
- **Consistentes** — mismos parámetros = misma clave siempre

```csharp
// Bueno: incluye todos los parámetros relevantes
public string CacheKey => $"product:{Id}:lang:{Language}";

// Malo: ignora parámetros importantes
public string CacheKey => "product";
```

### AbsoluteExpiration / SlidingExpiration

```csharp
// Absoluta: expira después de este tiempo sin importar el acceso
public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(30);

// Deslizante: reinicia el timer en cada acceso
public TimeSpan? SlidingExpiration => TimeSpan.FromMinutes(5);

// Ambas: el que dispare primero gana
public TimeSpan? AbsoluteExpiration => TimeSpan.FromHours(1);
public TimeSpan? SlidingExpiration => TimeSpan.FromMinutes(10);
```

### CacheGroup

Agrupa entradas de caché relacionadas para invalidación masiva:

```csharp
public string? CacheGroup => "products";
public string? CacheGroup => $"products:category:{CategoryId}"; // grupo más estrecho
```

### BypassCache

Cuando es `true`, omite la búsqueda en caché y siempre ejecuta el handler:

```csharp
public bool BypassCache => ForceRefresh;
```

### CacheOrder

```csharp
public enum CacheOrder
{
    CheckThenStore, // Por defecto: revisar caché → si falla, ejecutar y almacenar
    StoreOnly,      // Siempre ejecutar y almacenar (sobreescribir caché)
    CheckOnly,      // Solo revisar caché, nunca almacenar resultado
}
```

## Ejemplo Completo

```csharp
public record GetUserProfileQuery(Guid UserId, bool ForceRefresh = false)
    : IRequest<Result<UserProfileDto>>, ICacheable
{
    public string CacheKey => $"user-profile:{UserId}";
    public TimeSpan? AbsoluteExpiration => TimeSpan.FromHours(1);
    public TimeSpan? SlidingExpiration => TimeSpan.FromMinutes(15);
    public string? CacheGroup => $"user:{UserId}";
    public bool BypassCache => ForceRefresh;
    public CacheOrder Order => CacheOrder.CheckThenStore;
}
```
