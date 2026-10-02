---
id: migration
title: Guía de Migración
---

# Guía de Migración

## v2.x → v3.0

Core `Vali-Mediator` **3.0.0**; `AspNetCore`, `Caching`, `Idempotency`, `Observability` y `Resilience` **2.0.0**. Las extensiones llaman a la nueva firma `IPipelineBehavior.Handle(..., Func<CancellationToken, Task<T>> next)`, así que solo funcionan contra el core 3.x — **actualiza el core y las cinco extensiones a la vez**. Una extensión antigua contra el core 3.x falla en runtime con `MissingMethodException`. Usa `[3.0.0, 4.0.0)` como rango de dependencia recomendado.

### 1. Cambio obligatorio: `next` recibe un `CancellationToken`

```csharp
// 2.x
public async Task<TResponse> Handle(TRequest request, Func<Task<TResponse>> next, CancellationToken ct)
    => await next();

// 3.0
public async Task<TResponse> Handle(TRequest request, Func<CancellationToken, Task<TResponse>> next, CancellationToken ct)
    => await next(ct);   // o un token enlazado si el behavior cancela por su cuenta
```

Igual para `IPipelineBehavior<TDispatch>`: `Func<CancellationToken, Task> next`. Las lambdas que ignoraban el token pasan a `_ => ...`.

### 2. Cambios de comportamiento

| Área | Antes | Ahora | Acción |
|---|---|---|---|
| `Publish<T>` | Solo corrían los handlers del tipo estático | Unión de handlers del tipo estático y del tipo en runtime (sin duplicados) | Revisa handlers sobre tipos base/`INotification` que antes no corrían |
| Escaneo de assemblies | Escanear dos veces duplicaba handlers; ganaba el primer registro | Un solo registro; gana el **último** lifetime | Ninguna, salvo que dependieras del primer registro |
| `default(Result)` / `default(Result<T>)` | `Error = null`, `ErrorType.None` | Fallo explícito "no inicializado", `ErrorType.Failure`. `Fail("x", ErrorType.None)` conserva `None` | No uses `default` como éxito |
| `TimeoutBehavior` | El handler seguía corriendo tras el timeout | Cancela el token del handler; `TimeoutException` envuelve la excepción del handler como `InnerException` | Propaga el token en tus operaciones |
| Excepciones de handlers | Envueltas en `TargetInvocationException` | Tipo y stack originales | Elimina los `catch (TargetInvocationException)` |
| Resilience: orden | Fallback → Retry → Timeout → CB → Bulkhead → Hedge → RateLimiter → Chaos | **Fallback → Chaos → RateLimiter → Retry → Timeout → CB → Bulkhead → Hedge** | Un rechazo del rate limiter ya no se reintenta ni cuenta contra el circuit breaker |
| Resilience: resolución de policy | Cacheada por tipo (gana la primera request) | Se resuelve por request | Reutiliza una instancia, o usa `.WithSharedState("clave")` para compartir estado de Bulkhead/RateLimiter/CB entre policies construidas por request |
| Resilience: Hedge | Devolvía `default` si todos los intentos fallaban | Lanza la última excepción; los perdedores se cancelan | Maneja la excepción |
| Resilience: opciones | Valores inválidos se toleraban | `ArgumentOutOfRangeException` en `.Build()` | Corrige valores fuera de rango |
| Idempotency: formato de clave | `IdempotencyKey` | `Type#len:scope#key`; las entradas antiguas se tratan como miss | El handler se ejecuta una vez más justo después del upgrade |
| Idempotency: conflicto de payload | La misma clave siempre devolvía la respuesta guardada | Misma clave + payload distinto → `Conflict` / `IdempotencyConflictException` (desactivable con `VerifyRequestFingerprint = false`) | Evita campos volátiles (timestamps, correlation ids) en el request |
| Idempotency: `Expiration == null` | Sin expiración | Expiración por defecto del store (24 h) | Define `Expiration` explícito si querés otro valor |
| Idempotency / Caching | Las respuestas `Result` fallidas se guardaban | Nunca se guardan ni invalidan | Ninguna |
| AspNetCore | `Failure` (500) incluía `Result.Error` en `Detail` | Mensaje genérico; `ResultHttpOptions.ExposeErrorDetails = true` lo restaura | Actívalo solo en desarrollo |
| Observability | Un error de observer se propagaba como `AggregateException` | Aislado; visible vía la `Activity` / `IMetricsCollector.RecordObserverError`. Mensaje de excepción oculto salvo `IncludeExceptionMessage = true` | Suscribite al metrics collector si necesitabas verlo |

### 3. Límites nuevos y sus valores por defecto

| Opción | Default | Dónde |
|---|---|---|
| `InMemoryCacheOptions.MaxEntries` | 10.000 (antes 1.000) | Caching |
| `InMemoryCacheOptions.MaxKeyLength` / `MaxGroups` / `MaxKeysPerGroup` | 512 / 10.000 / 10.000 | Caching |
| `InMemoryCacheOptions.CleanupInterval` | 5 min | Caching |
| `CachingOptions.CoalescingWaitTimeout` | 30 s (`Timeout.InfiniteTimeSpan` permitido) | Caching |
| `IdempotencyOptions.MaxKeyLength` / `VerifyRequestFingerprint` | 256 / `true` | Idempotency |
| `InMemoryIdempotencyStoreOptions.MaxEntries` / `DefaultExpiration` | 10.000 / 24 h | Idempotency |
| `RateLimiterOptions.MaxPartitions` / `PartitionIdleTimeout` | 10.000 / 5 min | Resilience |
| `WithSharedState(key)` | tope de 10.000 claves | Resilience |
| `IValiMediator.SendAll(requests, maxDegreeOfParallelism, ct)` | sin límite si se omite | Core |
| `InMemoryDeadLetterQueue(maxEntries)` | 1.000 | Core |
| `ObservabilityOptions.IncludeExceptionMessage` | `false` | Observability |
| `ResultHttpOptions.ExposeErrorDetails` | `false` | AspNetCore |

Todos los límites se validan (lanzan `ArgumentOutOfRangeException` si son inválidos) y se configuran desde el registro DI del paquete correspondiente.

### 4. Checklist

1. Actualizá `Vali-Mediator` a 3.0.0 y las cinco extensiones a 2.0.0.
2. Actualizá tus propios `IPipelineBehavior` para que llamen a `next(ct)`.
3. Revisá la tabla de cambios de comportamiento contra tu uso real.
4. Corré tus pruebas. Si usás Idempotency, esperá una re-ejecución por clave justo después del deploy (cambió el formato de clave).

## v1.x → v2.0

La versión 2.0 introduce varios cambios que rompen la compatibilidad junto con nuevas características. Sigue esta guía para actualizar.

## Cambios que Rompen Compatibilidad

### 1. IPreProcessor e IPostProcessor ahora retornan Task

**Antes (v1.x):**
```csharp
public class MyPreProcessor : IPreProcessor<MyRequest>
{
    public void Process(MyRequest request, CancellationToken ct)
    {
        // implementación síncrona
    }
}
```

**Después (v2.0):**
```csharp
public class MyPreProcessor : IPreProcessor<MyRequest>
{
    public async Task Process(MyRequest request, CancellationToken ct)
    {
        // implementación async
        await Task.CompletedTask;
    }
}
```

Para implementaciones síncronas, retorna `Task.CompletedTask`:
```csharp
public Task Process(MyRequest request, CancellationToken ct)
{
    // trabajo síncrono aquí
    return Task.CompletedTask;
}
```

### 2. INotificationHandler.Priority ahora tiene implementación por defecto

**Antes (v1.x):** `Priority` era una propiedad abstracta — cada handler debía sobreescribirla.

**Después (v2.0):** `Priority` tiene implementación por defecto `=> 0` — sobreescribe solo cuando es necesario.

```csharp
// v1.x — requerido
public class MyHandler : INotificationHandler<MyEvent>
{
    public int Priority => 0; // debía estar aquí
    public async Task Handle(MyEvent n, CancellationToken ct) { ... }
}

// v2.0 — Priority puede omitirse si es 0
public class MyHandler : INotificationHandler<MyEvent>
{
    public async Task Handle(MyEvent n, CancellationToken ct) { ... }
}
```

## Nuevas Características en v2.0

### Patrón Result

```csharp
// Nuevo en v2.0 — usa Result<T> en lugar de lanzar excepciones
public async Task<Result<ProductDto>> Handle(GetProductQuery req, CancellationToken ct)
{
    var product = await _repo.FindAsync(req.Id, ct);
    if (product is null)
        return Result<ProductDto>.Fail("No encontrado.", ErrorType.NotFound);
    return Result<ProductDto>.Ok(product.ToDto());
}
```

### SendOrDefault

```csharp
// Nuevo en v2.0 — retorna default en lugar de lanzar HandlerNotFoundException
ProductDto? product = await _mediator.SendOrDefault(new GetProductQuery(id));
```

### SendAll

```csharp
// Nuevo en v2.0 — ejecución paralela
Result<ProductDto>[] results = await _mediator.SendAll(queries);
```

### Streaming

```csharp
// Nuevo en v2.0
IAsyncEnumerable<ProductDto> stream = _mediator.CreateStream(new GetProductsStream());
```

### ResilientParallel + Cola de Mensajes Muertos

```csharp
// Nuevo en v2.0
await _mediator.Publish(notification, PublishStrategy.ResilientParallel);
```

### IHasTimeout

```csharp
// Nuevo en v2.0 — timeout declarativo por solicitud
public record SlowQuery() : IRequest<Result<string>>, IHasTimeout
{
    public int TimeoutMs => 5000;
}
```

## Pasos de Migración

1. **Actualizar paquetes** a la versión `2.0.0`
2. **Corregir IPreProcessor/IPostProcessor** — cambiar `void Process(...)` a `Task Process(...)`
3. **Eliminar overrides obligatorios `Priority => 0`** donde no sea necesario (limpieza opcional)
4. **Adoptar `Result<T>`** — refactorizar handlers que lanzan excepciones de negocio
5. **Instalar paquetes de extensión** según sea necesario (Resilience, Caching, etc.)
6. **Agregar behaviors al DI** — `config.AddCachingBehavior()`, etc.

:::tip
La migración puede hacerse incrementalmente. Los handlers sin `Result<T>` siguen funcionando. Adopta el patrón Result handler por handler.
:::
