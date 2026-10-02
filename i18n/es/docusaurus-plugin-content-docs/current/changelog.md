---
id: changelog
title: Changelog
---

# Changelog

Todos los cambios relevantes de Vali-Mediator y sus paquetes de extensión se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) y este proyecto respeta [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Vali-Mediator 3.0.0 · Paquetes de Extensión 2.0.0

Lanzado el 2026-10-01

Core `Vali-Mediator` **3.0.0**; `AspNetCore`, `Caching`, `Idempotency`, `Observability` y `Resilience` **2.0.0**. Las extensiones llaman a la nueva firma `IPipelineBehavior.Handle(..., Func<CancellationToken, Task<T>> next)`, así que solo funcionan con el core 3.x — actualizá el core y **todas** las extensiones a la vez, usá `[3.0.0, 4.0.0)` como rango de dependencia recomendado. Ver la [Guía de Migración](./migration.md) para el checklist completo.

También se agregó el target framework `net10.0` en todos los paquetes (ahora `net7.0;net8.0;net9.0;net10.0`).

### Breaking (core)

- **`next` en los pipeline behaviors ahora recibe un `CancellationToken`.** `IPipelineBehavior<TRequest,TResponse>.Handle` toma `Func<CancellationToken, Task<TResponse>> next`; `IPipelineBehavior<TRequest>.Handle` toma `Func<CancellationToken, Task> next`. El mediator encadena el token efectivo hasta el handler, así que un behavior que cancela por su cuenta (un timeout, por ejemplo) ahora sí cancela realmente al handler.
- `Publish<T>` ahora corre los handlers registrados para el tipo en runtime **y** el tipo estático (deduplicados).
- Escanear el mismo assembly dos veces mantiene un solo registro; gana el **último** lifetime.
- `default(Result)` / `default(Result<T>)` reportan un fallo explícito de "no inicializado" (`ErrorType.Failure`); `Result.Fail("x", ErrorType.None)` conserva `ErrorType.None`.
- `TimeoutBehavior` lanza `TimeoutException` (la excepción del handler como `InnerException`) cada vez que expiró el timeout y el handler falló, no solo con `OperationCanceledException` — y ahora cancela realmente al handler en vez de dejarlo seguir corriendo.

### Added (core)

- `IValiMediator.SendAll(requests, maxDegreeOfParallelism, cancellationToken)` — fan-out con concurrencia acotada, los resultados conservan el orden de los requests.

### Changed (core)

- `Send`, `SendOrDefault`, fire-and-forget, streams y `Publish` usan dispatchers tipados cacheados por tipo de mensaje — sin `MakeGenericType`, `MethodInfo.Invoke` ni `object[]` por llamada. `Send` es aproximadamente 5× más rápido y asigna 60% menos memoria que 2.0.1 (net9.0, BenchmarkDotNet).

### Fixed (core)

- Una excepción de handler lanzada sincrónicamente ahora llega al caller con su tipo y stack original, sin el wrapper `TargetInvocationException`.
- `AddRequestBehavior<T>()` / `AddDispatchBehavior<T>()` con un tipo de behavior cerrado ya no rompe el registro de DI.
- Un pre/post processor registrado explícitamente **y** encontrado por el escaneo de assembly ya no corre dos veces.

### Breaking (Vali-Mediator.Resilience)

- **Nuevo orden de ejecución de políticas:** `Fallback → Chaos → RateLimiter → Retry → Timeout → Circuit Breaker → Bulkhead → Hedge → tu delegate`. Antes Chaos y el Rate Limiter corrían *adentro* de Retry y del Circuit Breaker, así que un rechazo del rate limiter se reintentaba, consumía un permiso por intento, y contaba como fallo del circuit breaker — ahora se evalúan una sola vez por llamada lógica.
- `ResilienceBehavior` resuelve la policy **por request** en lugar de cachearla por tipo `<TRequest,TResponse>` en la primera llamada. Los providers/factories que construyen una `ResiliencePolicy` nueva en cada llamada ahora pierden el estado de Circuit Breaker/Bulkhead/Rate Limiter entre llamadas — construí la policy una sola vez, o usá `.WithSharedState(key)`.
- Las opciones fuera de su rango válido lanzan en `.Build()` en vez de comportarse mal en runtime.
- Hedge devuelve la última excepción cuando todos los intentos fallan (antes devolvía `default(T)` silenciosamente); los intentos abandonados siguen corriendo si la operación ignora su cancellation token.

### Added (Vali-Mediator.Resilience)

- `ResiliencePolicyBuilder.WithSharedState(key)` — comparte el estado de Bulkhead/Rate Limiter/Circuit Breaker por nombre entre policies construidas por separado.
- `RateLimiterOptions.MaxPartitions` (default 10.000), `PartitionIdleTimeout` (default 5 min) — acota la memoria cuando la clave de partición viene de input del cliente.
- `ChaosOptions.InjectPerAttempt` — inyecta fallas dentro de Retry/Timeout/Circuit Breaker en vez de solo en la capa más externa.
- `FallbackOptions.FallbackOnResultPredicate` ahora realmente funciona (estaba documentado pero se ignoraba antes).

### Fixed (Vali-Mediator.Resilience)

- Circuit Breaker: `HalfOpenMaxAttempts` exacto, transiciones de estado atómicas bajo un solo lock, la cancelación del caller y los rechazos del bulkhead ya no cuentan como fallos.
- Retry: el backoff exponencial/linear/jitter ya no lanza `OverflowException` con muchos reintentos.
- Fallback ya no se traga el `OperationCanceledException` del caller.
- Bulkhead respeta correctamente `MaxQueuedCalls` (incluyendo `0` y timeout de cola infinito).

### Added (Vali-Mediator.Idempotency)

- **`IIdempotent.IdempotencyScope`** — aísla claves por usuario/tenant; el mismo `IdempotencyKey` bajo un scope distinto nunca comparte una respuesta.
- **Fingerprint del payload del request (SHA-256).** Reutilizar una clave con un payload distinto devuelve `Conflict` para respuestas `IResult`, o lanza `IdempotencyConflictException` en los demás casos. Desactivable con `IdempotencyOptions.VerifyRequestFingerprint = false`.
- **Reserva atómica entre procesos.** `IIdempotencyStore` suma `SupportsReservation`, `TryReserveAsync`, `ReleaseReservationAsync` — un store que lo adopta hace que dos instancias que reciben la misma clave al mismo tiempo la ejecuten una sola vez (verificado con dos procesos reales compartiendo Redis). `InMemoryIdempotencyStore` lo implementa; `IdempotencyOptions.ReservationLease` / `ReservationWaitTimeout` / `ReservationPollInterval` lo configuran, y se lanza `IdempotencyInProgressException` cuando la espera agota el tiempo.
- `IdempotencyOptions.MaxKeyLength` (default 256) e `InMemoryIdempotencyStoreOptions` (`MaxEntries` 10.000, `DefaultExpiration` 24h).

### Breaking (Vali-Mediator.Idempotency)

- La clave del store ahora incluye el scope (`Type#len:scope#key`) — las entradas escritas por builds de la era 2.x se tratan como miss (el handler corre una vez más tras el upgrade).

### Added (Vali-Mediator.Caching)

- **Coalescing de misses concurrentes** sobre la misma clave: el primer caller ejecuta el handler, el resto espera su resultado en lugar de golpear cada uno el backing store. `CachingOptions.CoalescingWaitTimeout` (default 30s) acota cuánto espera un seguidor antes de correr el handler por su cuenta.
- `InMemoryCacheOptions.MaxKeyLength` (512), `MaxGroups` (10.000), `MaxKeysPerGroup` (10.000) — todo límite se valida, y las claves/grupos controlados por el cliente que superan el límite se descartan en vez de aceptarse.

### Changed (Vali-Mediator.Caching)

- El default de `InMemoryCacheOptions.MaxEntries` sube de 1.000 a 10.000; `InMemoryCacheStore` reescrito alrededor de un solo lock + lista enlazada LRU, la expulsión ahora es O(1).
- Una clave pertenece a lo sumo a un grupo — registrarla bajo otro grupo la mueve.

### Added (Vali-Mediator.Observability)

- `ObservabilityOptions.IncludeExceptionMessage` (default `false`) — los mensajes de excepción se redactan al nombre del tipo en traces/logs/metrics salvo que se habilite explícitamente.
- `IMetricsCollector.RecordObserverError(...)` — invocado cada vez que un observer lanza una excepción.

### Changed (Vali-Mediator.Observability)

- Un observer que lanza una excepción nunca rompe a los demás ni al request: todos los observers siempre corren, y sus excepciones se recolectan en lugar de propagarse.

### Breaking (Vali-Mediator.AspNetCore)

- Las respuestas `Failure` (HTTP 500) ya no incluyen `Result.Error` en `ProblemDetails.Detail` por defecto — devuelven un mensaje genérico. Configurá `ResultHttpOptions.ExposeErrorDetails = true` para restaurar el comportamiento anterior (solo en desarrollo).

### Packaging

- Se dejó de generar el paquete de símbolos `.snupkg` — `DebugType` ya es `embedded` (el PDB va embebido en cada DLL), así que el paquete de símbolos separado no agregaba nada y solo arriesgaba a que el publish fallara por hipos del symbol-server de NuGet.org.

---

## Vali-Mediator.Resilience v1.2.2

Lanzado el 2026-04-20

### Fixed

- **Caché de policy de `ResilienceBehavior`** — la `ResiliencePolicy` resuelta ahora se cachea por tipo de request usando un campo estático (un slot por combinación `TRequest`+`TResponse`). Esto cubre **tanto** lambdas `AddResiliencePolicy<T>` como providers basados en clase `IResiliencePolicyProvider<T>`. Antes `GetPolicy()` se llamaba en cada request, haciendo que las policies con estado (Circuit Breaker, Rate Limiter, Bulkhead, Hedge) perdieran su estado acumulado sin importar cómo se hubiera registrado el provider.

---

## Vali-Mediator.Resilience v1.2.1

Lanzado el 2026-04-20

### Fixed

- **Caché de policy de `AddResiliencePolicy<T>`** — la `ResiliencePolicy` construida por la lambda inline ahora se construye una sola vez en el primer request y se cachea durante la vida de la aplicación. Antes la factory se invocaba en cada llamada, lo que hacía que las policies con estado (Circuit Breaker, Rate Limiter, Bulkhead, Hedge) perdieran su estado acumulado entre requests. El comportamiento ahora coincide con un `IResiliencePolicyProvider<T>` basado en clase registrado como singleton.

---

## Vali-Mediator.Resilience v1.2.0

Lanzado el 2026-04-20

### Added

- **`IResiliencePolicyProvider<TRequest>`** — nueva interfaz para declarar policies de resiliencia en una clase separada registrada en DI, manteniendo la configuración de la policy fuera del modelo de comando/query.
- **`services.AddResiliencePolicy<TRequest>(factory)`** — registro mediante lambda inline, sin necesidad de clase para la mayoría de los casos.
- **`services.AddResiliencePolicyProvider<TRequest, TProvider>()`** — registro basado en clase para providers que necesitan dependencias inyectadas (`IOptions`, `ILogger`, etc.).
- **`IGlobalResiliencePolicyProvider`** — policy de fallback aplicada a todo request que no tiene un provider específico registrado.
- **`services.AddGlobalResiliencePolicy(policy)`** — registra una policy global fija.
- **`services.AddGlobalResiliencePolicy(factory)`** — registra una factory de policy global que recibe la instancia del request.
- **`RateLimiterOptions.PartitionKeyResolver`** — `Func<object, string>` que habilita rate limiting por partición (ej. por ID de usuario o IP).

### Changed

- **`ResilienceBehavior<TRequest,TResponse>`** orden de resolución de policy: `IResiliencePolicyProvider<TRequest>` → `IResilient` (deprecado) → `IGlobalResiliencePolicyProvider`.

### Deprecated

- **`IResilient`** — marcado `[Obsolete]`. Usá `services.AddResiliencePolicy<TRequest>()` en su lugar. La interfaz sigue siendo funcional por compatibilidad hacia atrás.

---

## Paquetes de Extensión v1.1.0

Lanzado el 2026-04-20

Aplica a: `Vali-Mediator.Resilience`, `Vali-Mediator.Caching`, `Vali-Mediator.Observability`, `Vali-Mediator.Idempotency`, `Vali-Mediator.AspNetCore`

### Changed

- Todos los paquetes de extensión ahora referencian `Vali-Mediator` como `PackageReference` de NuGet en lugar de un `ProjectReference` local.

---

## Vali-Mediator v2.0.0

### Added

- **`Result<T>` / `Result`** — patrón de resultado como readonly struct con factories `Ok`/`Fail`, operadores funcionales `Map`, `Bind`, `MapAsync`, `BindAsync`, `Tap`, `OnFailure`, `Match`, y errores de validación estructurados (`IReadOnlyDictionary<string, IReadOnlyList<string>>`).
- **Enum `ErrorType`** — `None`, `Validation`, `NotFound`, `Conflict`, `Unauthorized`, `Forbidden`, `Failure`.
- **`IRequest` / `IRequestHandler<TRequest>`** — atajo para handlers que no retornan valor, vía `Unit`.
- **`PublishStrategy.Parallel`** — dispatch concurrente de notificaciones vía `Task.WhenAll`.
- **`PublishStrategy.ResilientParallel`** — todos los handlers corren aunque alguno falle; los fallos se capturan con `IDeadLetterQueue`.
- **`SendOrDefault<TResponse>`** — retorna `default` cuando no hay handler registrado.
- **`SendAll<T>`** — despacha múltiples requests concurrentemente vía `Task.WhenAll`.
- **`IStreamRequest<T>` / `IStreamRequestHandler<TRequest,TResponse>`** — streaming vía `IAsyncEnumerable<T>`.
- **`IHasTimeout`** — timeout declarativo por request con `services.AddTimeoutBehavior()`.
- **`INotificationFilter<TNotification>`** — ejecución condicional por handler vía `ShouldHandle()`.
- **`IDeadLetterQueue`** / **`services.AddInMemoryDeadLetterQueue()`** — captura fallos de `ResilientParallel`.
- **`HandlerNotFoundException`** — excepción tipada que hereda de `ValiMediatorException`.
- **Override de `ServiceLifetime`** — control de lifetime por assembly en `RegisterServicesFromAssembly`.
- **Auto-discovery** — pre/post processors descubiertos automáticamente por el escaneo de assembly.

### Changed

- `IPreProcessor` / `IPostProcessor` `.Process()` cambió de `void` a `Task` (breaking).
- `INotificationHandler.Priority` ahora tiene una implementación por defecto `=> 0`.
- Pipeline de behaviors: el primero registrado = el más externo (usa `Enumerable.Reverse` antes de construir la cadena).
