---
id: invalidation
title: Cache Invalidation
---

import Drawio from '@theme/Drawio';
import cacheInvalidation from '@site/static/diagrams/cache-invalidation.drawio';

# Cache Invalidation

Use `IInvalidatesCache` on any request to automatically invalidate cache entries when the request is processed.

## Interface

```csharp
public interface IInvalidatesCache
{
    IEnumerable<string> InvalidatedKeys { get; }
    IEnumerable<string> InvalidatedGroups { get; }
}
```

## Key Invalidation

Remove specific cache entries by their exact key:

```csharp
public record UpdateProductCommand(Guid Id, string Name, decimal Price)
    : IRequest<Result>, IInvalidatesCache
{
    // Invalidate the specific product's cached entry
    public IEnumerable<string> InvalidatedKeys => new[] { $"product:{Id}" };
    public IEnumerable<string> InvalidatedGroups => Enumerable.Empty<string>();
}
```

## Group Invalidation

Remove all cache entries in a group — useful when you don't know all the individual keys:

```csharp
public record CreateProductCommand(string Name, decimal Price, string Category)
    : IRequest<Result<Guid>>, IInvalidatesCache
{
    // A new product means all product list pages are stale
    public IEnumerable<string> InvalidatedKeys => Enumerable.Empty<string>();
    public IEnumerable<string> InvalidatedGroups => new[] { "products" };
}
```

## Combined Invalidation

```csharp
public record DeleteProductCommand(Guid Id)
    : IRequest<Result>, IInvalidatesCache
{
    public IEnumerable<string> InvalidatedKeys => new[]
    {
        $"product:{Id}",           // individual product entry
        $"product-details:{Id}",   // detail page entry
    };

    public IEnumerable<string> InvalidatedGroups => new[]
    {
        "products",               // all product list pages
        $"featured-products",     // featured products may include this one
    };
}
```

## Invalidation Timing

Cache invalidation runs **after** the handler executes successfully. If the handler fails (returns `Result.Fail` or throws), the cache is NOT invalidated.

<Drawio content={cacheInvalidation} />

## Complete Write-Through Pattern

```csharp
// Query — cached
public record GetProductQuery(Guid Id) : IRequest<Result<ProductDto>>, ICacheable
{
    public string CacheKey => $"product:{Id}";
    public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(30);
    public TimeSpan? SlidingExpiration => null;
    public string? CacheGroup => "products";
    public bool BypassCache => false;
    public CacheOrder Order => CacheOrder.CheckThenStore;
}

// Command — invalidates
public record UpdateProductCommand(Guid Id, string Name, decimal Price)
    : IRequest<Result>, IInvalidatesCache
{
    public IEnumerable<string> InvalidatedKeys => new[] { $"product:{Id}" };
    public IEnumerable<string> InvalidatedGroups => new[] { "products" };
}
```

:::tip Key Design Convention
Use a consistent key format across queries and invalidation commands. A good pattern is `entity-type:id` (e.g., `product:42`, `user:profile:100`). This makes it easy to compute invalidation keys from command parameters.
:::
