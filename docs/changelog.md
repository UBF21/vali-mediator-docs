---
id: changelog
title: Changelog
---

# Changelog

All notable changes to Vali-Mediator and its extension packages are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
