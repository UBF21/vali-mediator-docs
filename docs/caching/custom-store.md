---
id: custom-store
title: Custom Cache Store
---

# Custom Cache Store

Replace the in-memory store with a distributed cache backend by implementing `ICacheStore`.

## ICacheStore Interface

```csharp
public interface ICacheStore
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration, TimeSpan? slidingExpiration, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
}

// For group-based invalidation
public interface IGroupAwareCacheStore : ICacheStore
{
    Task RemoveGroupAsync(string group, CancellationToken ct = default);
    Task AddToGroupAsync(string key, string group, CancellationToken ct = default);
}
```

## Redis Implementation

```bash
dotnet add package StackExchange.Redis
```

```csharp
public class RedisCacheStore : IGroupAwareCacheStore
{
    private readonly IDatabase _db;
    private readonly IConnectionMultiplexer _redis;

    public RedisCacheStore(IConnectionMultiplexer redis)
    {
        _redis = redis;
        _db = redis.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        var value = await _db.StringGetAsync(key);
        if (!value.HasValue) return default;

        return JsonSerializer.Deserialize<T>(value!);
    }

    public async Task SetAsync<T>(
        string key,
        T value,
        TimeSpan? absoluteExpiration,
        TimeSpan? slidingExpiration,
        CancellationToken ct = default)
    {
        var serialized = JsonSerializer.Serialize(value);
        var expiry = absoluteExpiration ?? slidingExpiration;
        await _db.StringSetAsync(key, serialized, expiry);
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        await _db.KeyDeleteAsync(key);
    }

    public async Task AddToGroupAsync(string key, string group, CancellationToken ct = default)
    {
        // Use a Redis set to track keys in each group
        await _db.SetAddAsync($"group:{group}", key);
    }

    public async Task RemoveGroupAsync(string group, CancellationToken ct = default)
    {
        var groupKey = $"group:{group}";
        var members = await _db.SetMembersAsync(groupKey);

        var keys = members.Select(m => (RedisKey)(string)m!).Append(groupKey).ToArray();
        await _db.KeyDeleteAsync(keys);
    }
}
```

## Registration

```csharp
// Register Redis connection
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"]));

// Register your custom store (replaces AddInMemoryCacheStore)
builder.Services.AddSingleton<ICacheStore, RedisCacheStore>();
builder.Services.AddSingleton<IGroupAwareCacheStore, RedisCacheStore>();
```

Or use the extension method pattern:

```csharp
// Custom extension method
public static IServiceCollection AddRedisCacheStore(
    this IServiceCollection services,
    string connectionString)
{
    services.AddSingleton<IConnectionMultiplexer>(
        ConnectionMultiplexer.Connect(connectionString));
    services.AddSingleton<ICacheStore, RedisCacheStore>();
    services.AddSingleton<IGroupAwareCacheStore, RedisCacheStore>();
    return services;
}

// Usage
builder.Services.AddRedisCacheStore(builder.Configuration["Redis:ConnectionString"]!);
```

:::tip
For production workloads, use a distributed cache (Redis, SQL Server) so multiple instances of your application share the same cache and invalidations propagate correctly.
:::
