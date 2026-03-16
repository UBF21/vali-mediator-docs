---
id: custom-store
title: Tienda de Idempotencia Personalizada
---

# Tienda de Idempotencia Personalizada

Reemplaza el store en memoria con un backend persistente implementando `IIdempotencyStore`.

## Interfaz

```csharp
public interface IIdempotencyStore
{
    Task<byte[]?> FindAsync(string key, CancellationToken ct = default);
    Task StoreAsync(string key, byte[] value, TimeSpan expiration, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task<bool> ExistsAsync(string key, CancellationToken ct = default);
}
```

## Implementación Redis

```csharp
public class RedisIdempotencyStore : IIdempotencyStore
{
    private readonly IDatabase _db;

    public RedisIdempotencyStore(IConnectionMultiplexer redis)
    {
        _db = redis.GetDatabase();
    }

    public async Task<byte[]?> FindAsync(string key, CancellationToken ct = default)
    {
        var value = await _db.StringGetAsync(BuildKey(key));
        if (!value.HasValue) return null;
        return (byte[])value!;
    }

    public async Task StoreAsync(
        string key,
        byte[] value,
        TimeSpan expiration,
        CancellationToken ct = default)
    {
        await _db.StringSetAsync(BuildKey(key), value, expiration);
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
        => await _db.KeyDeleteAsync(BuildKey(key));

    public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
        => await _db.KeyExistsAsync(BuildKey(key));

    private static string BuildKey(string key) => $"idempotency:{key}";
}
```

## Registro

```csharp
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"]!));
builder.Services.AddSingleton<IIdempotencyStore, RedisIdempotencyStore>();
```

:::tip
Para implementaciones de alta disponibilidad, usa Redis con persistencia habilitada para asegurar que las claves de idempotencia sobrevivan reinicios. Configura la expiración para que sea al menos tan larga como la ventana de reintentos de tu cliente.
:::
