---
id: overview
title: Caching Overview
---

import Drawio from '@theme/Drawio';
import cachingOverview from '@site/static/diagrams/caching-overview.drawio';

# Caching

`Vali-Mediator.Caching` adds declarative pipeline caching to any `IRequest<T>` without modifying handler code.

## Installation

```bash
dotnet add package Vali-Mediator.Caching
```

## Setup

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddCachingBehavior();
});

// Register the cache store
builder.Services.AddInMemoryCacheStore();
```

## How It Works

<Drawio content={cachingOverview} />

## Quick Example

```csharp
// Mark request as cacheable
public record GetProductQuery(Guid Id)
    : IRequest<Result<ProductDto>>, ICacheable
{
    public string CacheKey => $"product:{Id}";
    public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(10);
    public TimeSpan? SlidingExpiration => null;
    public string? CacheGroup => "products";
    public bool BypassCache => false;
    public CacheOrder Order => CacheOrder.CheckThenStore;
}
```

The handler needs no changes — caching is applied transparently by the pipeline behavior.

## Key Concepts

| Concept | Description |
|---------|-------------|
| `ICacheable` | Marks a request as cacheable; provides cache key and expiration |
| `IInvalidatesCache` | Marks a request that invalidates cached entries on execution |
| `ICacheStore` | Abstraction for the cache backend (in-memory, Redis, etc.) |
| `CacheOrder` | Controls check-then-store vs store-only vs check-only |
| `CacheGroup` | Groups related cache entries for bulk invalidation |

## Cache Store Options

| Store | Package | Use Case |
|-------|---------|----------|
| `InMemoryCacheStore` | Built-in | Development, single-node |
| Redis | Implement `ICacheStore` | Production, distributed |
| SQL Server | Implement `ICacheStore` | Durable caching |
