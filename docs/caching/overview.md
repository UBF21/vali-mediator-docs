---
id: overview
title: Caching Overview
---

import Drawio from '@theme/Drawio';
import cachingOverview from '@site/static/diagrams/caching-overview.drawio';

# Caching

`Vali-Mediator.Caching` adds declarative pipeline caching to any `IRequest<T>` without modifying handler code — including automatic coalescing of concurrent cache misses so a stampede of identical requests only runs the handler once.

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
    public CacheOrder Order => CacheOrder.ReadThenWrite;
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

## Coalescing Concurrent Misses

When several requests ask for the same cache key at the same time and it's a miss, only the first one runs the handler — the rest await that same in-flight call instead of each hitting the backing store (and, transitively, the database). This is automatic whenever `AddCachingBehavior()` is registered; the only knob is how long a follower waits before giving up and running the handler itself:

```csharp
builder.Services.AddCachingOptions(options =>
{
    options.CoalescingWaitTimeout = TimeSpan.FromSeconds(30); // bounds the damage of a hung handler
});
```

## In-Memory Store Limits

Every limit is validated (must be greater than zero) and bounds memory even when keys/groups come from client-controlled input — an oversized key or a group past the limit is dropped instead of accepted:

```csharp
builder.Services.AddInMemoryCacheStore(options =>
{
    options.MaxEntries = 10_000;             // least-recently-used entry evicted when full
    options.MaxKeyLength = 512;              // longer keys/group names are never stored
    options.MaxGroups = 10_000;              // distinct groups indexed at once
    options.MaxKeysPerGroup = 10_000;        // keys indexed under one group
    options.CleanupInterval = TimeSpan.FromMinutes(5);
});
```
