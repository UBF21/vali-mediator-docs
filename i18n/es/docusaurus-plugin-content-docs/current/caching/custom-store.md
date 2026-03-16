---
id: custom-store
title: Tienda de Caché Personalizada
---

# Tienda de Caché Personalizada

Reemplaza el store en memoria con un backend de caché distribuido implementando `ICacheStore`.

## Interfaz ICacheStore

```csharp
public interface ICacheStore
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration, TimeSpan? slidingExpiration, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
}

// Para invalidación basada en grupos
public interface IGroupAwareCacheStore : ICacheStore
{
    Task RemoveGroupAsync(string group, CancellationToken ct = default);
    Task AddToGroupAsync(string key, string group, CancellationToken ct = default);
}
```

## Implementación Redis

```csharp
public class RedisCacheStore : IGroupAwareCacheStore
{
    private readonly IDatabase _db;

    public RedisCacheStore(IConnectionMultiplexer redis)
    {
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
        => await _db.KeyDeleteAsync(key);

    public async Task AddToGroupAsync(string key, string group, CancellationToken ct = default)
        => await _db.SetAddAsync($"group:{group}", key);

    public async Task RemoveGroupAsync(string group, CancellationToken ct = default)
    {
        var groupKey = $"group:{group}";
        var members = await _db.SetMembersAsync(groupKey);
        var keys = members.Select(m => (RedisKey)(string)m!).Append(groupKey).ToArray();
        await _db.KeyDeleteAsync(keys);
    }
}
```

## Registro

```csharp
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"]!));

builder.Services.AddSingleton<ICacheStore, RedisCacheStore>();
builder.Services.AddSingleton<IGroupAwareCacheStore, RedisCacheStore>();
```

:::tip
Para cargas de trabajo en producción, usa caché distribuida (Redis, SQL Server) para que múltiples instancias de tu aplicación compartan la misma caché y las invalidaciones se propaguen correctamente.
:::
