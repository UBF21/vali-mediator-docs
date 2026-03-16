---
id: icacheable
title: ICacheable Interface
---

# ICacheable Interface

Implement `ICacheable` on an `IRequest<T>` to make it cacheable via the pipeline behavior.

## Interface

```csharp
public interface ICacheable
{
    string CacheKey { get; }
    TimeSpan? AbsoluteExpiration { get; }
    TimeSpan? SlidingExpiration { get; }
    string? CacheGroup { get; }
    bool BypassCache { get; }
    CacheOrder Order { get; }
}
```

## Properties

### CacheKey

A unique string identifier for this cached value. Design keys to be:
- **Specific** — include all parameters that affect the result
- **Consistent** — same parameters = same key every time

```csharp
// Good: includes all relevant parameters
public string CacheKey => $"product:{Id}:lang:{Language}";

// Bad: ignores important parameters
public string CacheKey => "product";
```

### AbsoluteExpiration

The cached value expires after this duration, regardless of access:

```csharp
public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(30);
```

### SlidingExpiration

Resets the expiration timer on each access. Entry expires if not accessed within this window:

```csharp
public TimeSpan? SlidingExpiration => TimeSpan.FromMinutes(5);
```

You can use both — whichever fires first wins:
```csharp
public TimeSpan? AbsoluteExpiration => TimeSpan.FromHours(1);  // hard limit
public TimeSpan? SlidingExpiration => TimeSpan.FromMinutes(10); // idle eviction
```

### CacheGroup

Groups related cache entries for bulk invalidation. Useful for invalidating all entries related to a resource:

```csharp
// All product queries in the "products" group
public string? CacheGroup => "products";
public string? CacheGroup => $"products:category:{CategoryId}"; // narrower group
```

### BypassCache

When `true`, skips cache lookup and always executes the handler. The result is also not stored:

```csharp
// Read from cache or handler
public bool BypassCache => false;

// Always go to handler (e.g., when user explicitly requests fresh data)
public bool BypassCache => ForceRefresh;
```

### CacheOrder (CacheOrder Enum)

```csharp
public enum CacheOrder
{
    CheckThenStore, // Default: check cache → if miss, execute and store
    StoreOnly,      // Always execute and store (overwrite cache)
    CheckOnly,      // Only check cache, never store result
}
```

## Complete Example

```csharp
public record GetUserProfileQuery(Guid UserId, bool ForceRefresh = false)
    : IRequest<Result<UserProfileDto>>, ICacheable
{
    public string CacheKey => $"user-profile:{UserId}";
    public TimeSpan? AbsoluteExpiration => TimeSpan.FromHours(1);
    public TimeSpan? SlidingExpiration => TimeSpan.FromMinutes(15);
    public string? CacheGroup => $"user:{UserId}"; // for per-user invalidation
    public bool BypassCache => ForceRefresh;
    public CacheOrder Order => CacheOrder.CheckThenStore;
}

public record GetProductListQuery(string Category, int Page)
    : IRequest<Result<PagedList<ProductDto>>>, ICacheable
{
    public string CacheKey => $"products:cat:{Category}:page:{Page}";
    public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(5);
    public TimeSpan? SlidingExpiration => null;
    public string? CacheGroup => "products";
    public bool BypassCache => false;
    public CacheOrder Order => CacheOrder.CheckThenStore;
}
```

:::tip
Design your `CacheGroup` values strategically. A write operation can invalidate an entire group, so groups should reflect the scope of what changes together. For example, all products in a category can share a group.
:::
