---
id: changelog
title: Changelog
---

# Changelog

All notable changes to Vali-Mediator and its extension packages are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Vali-Mediator 3.0.0 · Extension Packages 2.0.0

Released on 2026-10-01

Core `Vali-Mediator` **3.0.0**; `AspNetCore`, `Caching`, `Idempotency`, `Observability` and `Resilience` **2.0.0**. The extensions call the new `IPipelineBehavior.Handle(..., Func<CancellationToken, Task<T>> next)` signature, so they only work with core 3.x — upgrade the core and **all** extensions together, use `[3.0.0, 4.0.0)` as the recommended dependency range. See the [Migration Guide](./migration.md) for the full upgrade checklist.

Also added the `net10.0` target framework across every package (now `net7.0;net8.0;net9.0;net10.0`).

### Breaking (core)

- **`next` in pipeline behaviors now takes a `CancellationToken`.** `IPipelineBehavior<TRequest,TResponse>.Handle` takes `Func<CancellationToken, Task<TResponse>> next`; `IPipelineBehavior<TRequest>.Handle` takes `Func<CancellationToken, Task> next`. The mediator chains the effective token down to the handler, so a behavior that cancels on its own (a timeout, for example) now really cancels the handler.
- `Publish<T>` now runs handlers registered for the runtime type **and** the static type (deduplicated).
- Scanning the same assembly twice keeps a single registration; the **last** lifetime wins.
- `default(Result)` / `default(Result<T>)` report an explicit "not initialized" failure (`ErrorType.Failure`); `Result.Fail("x", ErrorType.None)` keeps `ErrorType.None`.
- `TimeoutBehavior` throws `TimeoutException` (handler exception as `InnerException`) whenever the timeout expired and the handler failed, not only on `OperationCanceledException` — and it now actually cancels the handler instead of letting it keep running.

### Added (core)

- `IValiMediator.SendAll(requests, maxDegreeOfParallelism, cancellationToken)` — bounded-concurrency fan-out, results keep request order.

### Changed (core)

- `Send`, `SendOrDefault`, fire-and-forget, streams and `Publish` use typed dispatchers cached per message type — no `MakeGenericType`, `MethodInfo.Invoke` or `object[]` per call. `Send` is roughly 5× faster and allocates 60% less than 2.0.1 (net9.0, BenchmarkDotNet).

### Fixed (core)

- A handler exception thrown synchronously now reaches the caller with its original type and stack, no `TargetInvocationException` wrapper.
- `AddRequestBehavior<T>()` / `AddDispatchBehavior<T>()` with a closed behavior type no longer crashes DI registration.
- A pre/post processor registered explicitly **and** found by the assembly scan no longer runs twice.

### Breaking (Vali-Mediator.Resilience)

- **New policy execution order:** `Fallback → Chaos → Rate Limiter → Retry → Timeout → Circuit Breaker → Bulkhead → Hedge → your delegate`. Previously Chaos and the Rate Limiter ran *inside* Retry and the Circuit Breaker, so a rate-limit rejection was retried, consumed one permit per attempt, and counted as a circuit-breaker failure — they're now evaluated once per logical call.
- `ResilienceBehavior` resolves the policy **per request** instead of caching it per `<TRequest,TResponse>` type on the first call. Providers/factories that build a new `ResiliencePolicy` per call now lose Circuit Breaker/Bulkhead/Rate Limiter state between calls — build the policy once, or use `.WithSharedState(key)`.
- Options outside their valid range throw at `.Build()` instead of misbehaving at run time.
- Hedge returns the last exception when every attempt fails (previously returned `default(T)` silently); abandoned attempts keep running if the operation ignores its cancellation token.

### Added (Vali-Mediator.Resilience)

- `ResiliencePolicyBuilder.WithSharedState(key)` — shares Bulkhead/Rate Limiter/Circuit Breaker state by name between separately built policies.
- `RateLimiterOptions.MaxPartitions` (default 10,000), `PartitionIdleTimeout` (default 5 min) — bounds memory when the partition key comes from client input.
- `ChaosOptions.InjectPerAttempt` — inject faults inside Retry/Timeout/Circuit Breaker instead of only at the outermost layer.
- `FallbackOptions.FallbackOnResultPredicate` now actually works (it was documented but ignored before).

### Fixed (Vali-Mediator.Resilience)

- Circuit Breaker: exact `HalfOpenMaxAttempts`, atomic state transitions under a single lock, caller cancellation and bulkhead rejections no longer count as failures.
- Retry: exponential/linear/jitter backoff no longer throws `OverflowException` with many retries.
- Fallback no longer swallows the caller's `OperationCanceledException`.
- Bulkhead honors `MaxQueuedCalls` correctly (including `0` and infinite queue timeout).

### Added (Vali-Mediator.Idempotency)

- **`IIdempotent.IdempotencyScope`** — isolates keys per user/tenant; the same `IdempotencyKey` under a different scope never shares a response.
- **Request payload fingerprint (SHA-256).** Reusing a key with a different payload returns `Conflict` for `IResult` responses, or throws `IdempotencyConflictException` otherwise. Disable with `IdempotencyOptions.VerifyRequestFingerprint = false`.
- **Atomic cross-process reservation.** `IIdempotencyStore` gains `SupportsReservation`, `TryReserveAsync`, `ReleaseReservationAsync` — a store that opts in makes two instances receiving the same key at the same time run it only once (verified with two real processes sharing Redis). `InMemoryIdempotencyStore` implements it; `IdempotencyOptions.ReservationLease` / `ReservationWaitTimeout` / `ReservationPollInterval` configure it, and `IdempotencyInProgressException` is thrown when the wait times out.
- `IdempotencyOptions.MaxKeyLength` (default 256) and `InMemoryIdempotencyStoreOptions` (`MaxEntries` 10,000, `DefaultExpiration` 24h).

### Breaking (Vali-Mediator.Idempotency)

- The store key now includes the scope (`Type#len:scope#key`) — entries written by 2.x-era builds are treated as a miss (the handler runs once more after upgrading).

### Added (Vali-Mediator.Caching)

- **Coalescing of concurrent misses** on the same key: the first caller runs the handler, the rest await its result instead of each hitting the backing store. `CachingOptions.CoalescingWaitTimeout` (default 30s) bounds how long a follower waits before running the handler itself.
- `InMemoryCacheOptions.MaxKeyLength` (512), `MaxGroups` (10,000), `MaxKeysPerGroup` (10,000) — every limit is validated, and client-controlled keys/groups past the limit are dropped instead of accepted.

### Changed (Vali-Mediator.Caching)

- `InMemoryCacheOptions.MaxEntries` default raised from 1,000 to 10,000; `InMemoryCacheStore` rewritten around a single lock + LRU linked list, eviction is now O(1).
- A key belongs to at most one group — registering it under another group moves it.

### Added (Vali-Mediator.Observability)

- `ObservabilityOptions.IncludeExceptionMessage` (default `false`) — exception messages are redacted to just the type name on traces/logs/metrics unless explicitly opted in.
- `IMetricsCollector.RecordObserverError(...)` — invoked whenever an observer throws.

### Changed (Vali-Mediator.Observability)

- A throwing observer never breaks the others or the request: every observer always runs, and their exceptions are collected instead of propagated.

### Breaking (Vali-Mediator.AspNetCore)

- `Failure` (HTTP 500) responses no longer include `Result.Error` in `ProblemDetails.Detail` by default — they return a generic message. Set `ResultHttpOptions.ExposeErrorDetails = true` to restore the previous behavior (development only).

### Packaging

- Stopped producing `.snupkg` symbol packages — `DebugType` is already `embedded` (the PDB ships inside each DLL), so the separate symbol package added nothing and only risked failing the publish on NuGet.org's symbol-server hiccups.

---

## Vali-Mediator.Resilience v1.2.2

Released on 2026-04-20

### Fixed

- **`ResilienceBehavior` policy caching** — the resolved `ResiliencePolicy` is now cached per request type using a static field (one slot per `TRequest`+`TResponse` combination). This covers **both** `AddResiliencePolicy<T>` lambdas and class-based `IResiliencePolicyProvider<T>` providers. Previously `GetPolicy()` was called on every request, causing stateful policies (Circuit Breaker, Rate Limiter, Bulkhead, Hedge) to lose their accumulated state regardless of how the provider was registered.

---

## Vali-Mediator.Resilience v1.2.1

Released on 2026-04-20

### Fixed

- **`AddResiliencePolicy<T>` policy caching** — the `ResiliencePolicy` built by the inline lambda is now constructed once on the first request and cached for the lifetime of the application. Previously the factory was invoked on every call, which caused stateful policies (Circuit Breaker, Rate Limiter, Bulkhead, Hedge) to lose their accumulated state between requests. Behavior now matches a class-based `IResiliencePolicyProvider<T>` registered as singleton.

---

## Vali-Mediator.Resilience v1.2.0

Released on 2026-04-20

### Added

- **`IResiliencePolicyProvider<TRequest>`** — new interface for declaring resilience policies in a separate class registered in DI, keeping policy configuration out of the command/query model.
- **`services.AddResiliencePolicy<TRequest>(factory)`** — inline lambda registration, no class needed for the majority of cases.
- **`services.AddResiliencePolicyProvider<TRequest, TProvider>()`** — class-based registration for providers that need injected dependencies (`IOptions`, `ILogger`, etc.).
- **`IGlobalResiliencePolicyProvider`** — fallback policy applied to every request that has no specific provider registered.
- **`services.AddGlobalResiliencePolicy(policy)`** — register a fixed global policy.
- **`services.AddGlobalResiliencePolicy(factory)`** — register a global policy factory that receives the request instance.
- **`RateLimiterOptions.PartitionKeyResolver`** — `Func<object, string>` that enables per-partition rate limiting (e.g. per user ID or IP).

### Changed

- **`ResilienceBehavior<TRequest,TResponse>`** policy resolution order: `IResiliencePolicyProvider<TRequest>` → `IResilient` (deprecated) → `IGlobalResiliencePolicyProvider`.

### Deprecated

- **`IResilient`** — marked `[Obsolete]`. Use `services.AddResiliencePolicy<TRequest>()` instead. The interface remains functional for backward compatibility.

---

## Extension Packages v1.1.0

Released on 2026-04-20

Applies to: `Vali-Mediator.Resilience`, `Vali-Mediator.Caching`, `Vali-Mediator.Observability`, `Vali-Mediator.Idempotency`, `Vali-Mediator.AspNetCore`

### Changed

- All extension packages now reference `Vali-Mediator` as a NuGet `PackageReference` instead of a local `ProjectReference`.

---

## Vali-Mediator v2.0.0

### Added

- **`Result<T>` / `Result`** — readonly struct result pattern with `Ok`/`Fail` factories, `Map`, `Bind`, `MapAsync`, `BindAsync`, `Tap`, `OnFailure`, `Match` functional operators, and structured validation errors (`IReadOnlyDictionary<string, IReadOnlyList<string>>`).
- **`ErrorType` enum** — `None`, `Validation`, `NotFound`, `Conflict`, `Unauthorized`, `Forbidden`, `Failure`.
- **`IRequest` / `IRequestHandler<TRequest>`** — shorthand for void-returning handlers via `Unit`.
- **`PublishStrategy.Parallel`** — concurrent notification dispatch via `Task.WhenAll`.
- **`PublishStrategy.ResilientParallel`** — all handlers run even if some fail; failures captured by `IDeadLetterQueue`.
- **`SendOrDefault<TResponse>`** — returns `default` when no handler is registered.
- **`SendAll<T>`** — dispatches multiple requests concurrently via `Task.WhenAll`.
- **`IStreamRequest<T>` / `IStreamRequestHandler<TRequest,TResponse>`** — streaming via `IAsyncEnumerable<T>`.
- **`IHasTimeout`** — declarative per-request timeout with `services.AddTimeoutBehavior()`.
- **`INotificationFilter<TNotification>`** — per-handler conditional execution via `ShouldHandle()`.
- **`IDeadLetterQueue`** / **`services.AddInMemoryDeadLetterQueue()`** — captures failures from `ResilientParallel`.
- **`HandlerNotFoundException`** — typed exception inheriting `ValiMediatorException`.
- **`ServiceLifetime` override** — per-assembly lifetime control in `RegisterServicesFromAssembly`.
- **Auto-discovery** — pre/post processors discovered automatically from assembly scan.

### Changed

- `IPreProcessor` / `IPostProcessor` `.Process()` changed from `void` to `Task` (breaking).
- `INotificationHandler.Priority` now has a default implementation `=> 0`.
- Behaviors pipeline: first registered = outermost (uses `Enumerable.Reverse` before building chain).
