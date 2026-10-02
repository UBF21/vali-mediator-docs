---
id: migration
title: Migration Guide
---

# Migration Guide

## v2.x → v3.0

Core `Vali-Mediator` **3.0.0**; `AspNetCore`, `Caching`, `Idempotency`, `Observability` and `Resilience` **2.0.0**. The extension packages call the new `IPipelineBehavior.Handle(..., Func<CancellationToken, Task<T>> next)` signature, so they only work against core 3.x — **update the core and all five extensions together**. An old extension against the 3.x core fails at runtime with a `MissingMethodException`. Use `[3.0.0, 4.0.0)` as the recommended dependency range.

### 1. Required breaking change: `next` takes a `CancellationToken`

```csharp
// 2.x
public async Task<TResponse> Handle(TRequest request, Func<Task<TResponse>> next, CancellationToken ct)
    => await next();

// 3.0
public async Task<TResponse> Handle(TRequest request, Func<CancellationToken, Task<TResponse>> next, CancellationToken ct)
    => await next(ct);   // or a linked token if the behavior cancels on its own
```

Same for `IPipelineBehavior<TDispatch>`: `Func<CancellationToken, Task> next`. Lambdas that used to ignore the token become `_ => ...`.

### 2. Behavior changes

| Area | Before | Now | Action |
|---|---|---|---|
| `Publish<T>` | Only static-type handlers ran | Union of static-type and runtime-type handlers (deduplicated) | Check handlers on base types/`INotification` that previously didn't run |
| Assembly scanning | Scanning twice duplicated handlers; first registration won | Single registration; **last** lifetime wins | None, unless you relied on the first-wins behavior |
| `default(Result)` / `default(Result<T>)` | `Error = null`, `ErrorType.None` | Explicit "not initialized" failure, `ErrorType.Failure`. `Fail("x", ErrorType.None)` still keeps `None` | Don't treat `default` as success |
| `TimeoutBehavior` | Handler kept running after timeout | Cancels the handler's token; `TimeoutException` wraps the handler's exception as `InnerException` | Pass the token through your operations |
| Handler exceptions | Wrapped in `TargetInvocationException` | Original type and stack | Remove `catch (TargetInvocationException)` |
| Resilience: order | Fallback → Retry → Timeout → CB → Bulkhead → Hedge → RateLimiter → Chaos | **Fallback → Chaos → RateLimiter → Retry → Timeout → CB → Bulkhead → Hedge** | A rate-limit rejection is no longer retried or counted against the circuit breaker |
| Resilience: policy resolution | Cached per type (first request wins) | Resolved per request | Reuse one instance, or use `.WithSharedState("key")` to share Bulkhead/RateLimiter/CB state between per-request policies |
| Resilience: Hedge | Returned `default` when every attempt failed | Throws the last exception; losers are cancelled | Handle the exception |
| Resilience: options | Invalid values were tolerated | `ArgumentOutOfRangeException` at `.Build()` | Fix out-of-range values |
| Idempotency: key format | `IdempotencyKey` | `Type#len:scope#key`; old entries are treated as a miss | The handler runs once more right after the upgrade |
| Idempotency: payload conflict | Same key always replayed the stored response | Same key + different payload → `Conflict` / `IdempotencyConflictException` (disable with `VerifyRequestFingerprint = false`) | Avoid volatile fields (timestamps, correlation ids) in the request |
| Idempotency: `Expiration == null` | No expiration | Store's default expiration (24h) | Set `Expiration` explicitly for a different value |
| Idempotency / Caching | Failed `Result` responses were stored | Never stored or invalidated | None |
| AspNetCore | `Failure` (500) included `Result.Error` in `Detail` | Generic detail message; `ResultHttpOptions.ExposeErrorDetails = true` restores it | Only enable in development |
| Observability | An observer error propagated as `AggregateException` | Isolated; visible via the `Activity` / `IMetricsCollector.RecordObserverError`. Exception message hidden unless `IncludeExceptionMessage = true` | Subscribe to the metrics collector if you relied on seeing it |

### 3. New limits and their defaults

| Option | Default | Where |
|---|---|---|
| `InMemoryCacheOptions.MaxEntries` | 10,000 (was 1,000) | Caching |
| `InMemoryCacheOptions.MaxKeyLength` / `MaxGroups` / `MaxKeysPerGroup` | 512 / 10,000 / 10,000 | Caching |
| `InMemoryCacheOptions.CleanupInterval` | 5 min | Caching |
| `CachingOptions.CoalescingWaitTimeout` | 30s (`Timeout.InfiniteTimeSpan` allowed) | Caching |
| `IdempotencyOptions.MaxKeyLength` / `VerifyRequestFingerprint` | 256 / `true` | Idempotency |
| `InMemoryIdempotencyStoreOptions.MaxEntries` / `DefaultExpiration` | 10,000 / 24h | Idempotency |
| `RateLimiterOptions.MaxPartitions` / `PartitionIdleTimeout` | 10,000 / 5 min | Resilience |
| `WithSharedState(key)` | capped at 10,000 keys | Resilience |
| `IValiMediator.SendAll(requests, maxDegreeOfParallelism, ct)` | unbounded if omitted | Core |
| `InMemoryDeadLetterQueue(maxEntries)` | 1,000 | Core |
| `ObservabilityOptions.IncludeExceptionMessage` | `false` | Observability |
| `ResultHttpOptions.ExposeErrorDetails` | `false` | AspNetCore |

Every limit is validated (throws `ArgumentOutOfRangeException` when invalid) and configured through the relevant package's DI registration.

### 4. Checklist

1. Bump `Vali-Mediator` to 3.0.0 and all five extensions to 2.0.0.
2. Update your own `IPipelineBehavior` implementations to call `next(ct)`.
3. Check the behavior-changes table above against your actual usage.
4. Run your tests. If you use Idempotency, expect one re-execution per key right after deploying (the key format changed).

## v1.x → v2.0

Version 2.0 introduces several breaking changes alongside new features. Follow this guide to upgrade.

## Breaking Changes

### 1. IPreProcessor and IPostProcessor now return Task

**Before (v1.x):**
```csharp
public class MyPreProcessor : IPreProcessor<MyRequest>
{
    public void Process(MyRequest request, CancellationToken ct)
    {
        // sync implementation
    }
}
```

**After (v2.0):**
```csharp
public class MyPreProcessor : IPreProcessor<MyRequest>
{
    public async Task Process(MyRequest request, CancellationToken ct)
    {
        // async implementation
        await Task.CompletedTask;
    }
}
```

For sync implementations, return `Task.CompletedTask`:
```csharp
public Task Process(MyRequest request, CancellationToken ct)
{
    // sync work here
    return Task.CompletedTask;
}
```

### 2. INotificationHandler.Priority now has a default implementation

**Before (v1.x):** `Priority` was an abstract property — every handler had to override it.

**After (v2.0):** `Priority` has a default implementation `=> 0` — override only when needed.

```csharp
// v1.x — required
public class MyHandler : INotificationHandler<MyEvent>
{
    public int Priority => 0; // had to be here

    public async Task Handle(MyEvent n, CancellationToken ct) { ... }
}

// v2.0 — Priority can be omitted if 0
public class MyHandler : INotificationHandler<MyEvent>
{
    public async Task Handle(MyEvent n, CancellationToken ct) { ... }
}
```

### 3. ValiMediatorConfiguration uses List (order preserved)

In v1.x, behaviors were stored in a `Dictionary<Type, Type>`, which prevented registering multiple behaviors of the same open-generic type.

In v2.0, `List<(Type, Type)>` is used — **registration order is preserved and duplicates are allowed**.

No code change required unless you were relying on dictionary semantics.

## New Features in v2.0

### Result Pattern

```csharp
// New in v2.0 — use Result<T> instead of throwing exceptions
public async Task<Result<ProductDto>> Handle(GetProductQuery req, CancellationToken ct)
{
    var product = await _repo.FindAsync(req.Id, ct);
    if (product is null)
        return Result<ProductDto>.Fail("Not found.", ErrorType.NotFound);
    return Result<ProductDto>.Ok(product.ToDto());
}
```

### SendOrDefault

```csharp
// New in v2.0 — returns default instead of throwing HandlerNotFoundException
ProductDto? product = await _mediator.SendOrDefault(new GetProductQuery(id));
```

### SendAll

```csharp
// New in v2.0 — parallel execution
Result<ProductDto>[] results = await _mediator.SendAll(queries);
```

### Streaming

```csharp
// New in v2.0
IAsyncEnumerable<ProductDto> stream = _mediator.CreateStream(new GetProductsStream());
```

### ResilientParallel + Dead Letter Queue

```csharp
// New in v2.0
await _mediator.Publish(notification, PublishStrategy.ResilientParallel);
```

### IHasTimeout

```csharp
// New in v2.0 — declarative per-request timeout
public record SlowQuery() : IRequest<Result<string>>, IHasTimeout
{
    public int TimeoutMs => 5000;
}
```

## Migration Steps

1. **Update packages** to version `2.0.0`
2. **Fix IPreProcessor/IPostProcessor** — change `void Process(...)` to `Task Process(...)`
3. **Remove mandatory `Priority => 0`** overrides where not needed (optional cleanup)
4. **Adopt `Result<T>`** — refactor handlers that throw business exceptions
5. **Install extension packages** as needed (Resilience, Caching, etc.)
6. **Add behaviors to DI** — `config.AddCachingBehavior()`, etc.

:::tip
The migration can be done incrementally. Old handlers without `Result<T>` continue to work. Adopt the Result pattern handler by handler.

:::
