---
id: migration
title: Migration Guide
---

# Migration Guide

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
