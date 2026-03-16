---
id: custom-store
title: Custom Idempotency Store
---

# Custom Idempotency Store

Replace the in-memory store with a persistent backend by implementing `IIdempotencyStore`.

## Interface

```csharp
public interface IIdempotencyStore
{
    Task<byte[]?> FindAsync(string key, CancellationToken ct = default);
    Task StoreAsync(string key, byte[] value, TimeSpan expiration, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task<bool> ExistsAsync(string key, CancellationToken ct = default);
}
```

## Redis Implementation

```bash
dotnet add package StackExchange.Redis
```

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
    {
        await _db.KeyDeleteAsync(BuildKey(key));
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
    {
        return await _db.KeyExistsAsync(BuildKey(key));
    }

    private static string BuildKey(string key) => $"idempotency:{key}";
}
```

## SQL Server Implementation

```csharp
public class SqlIdempotencyStore : IIdempotencyStore
{
    private readonly string _connectionString;

    public SqlIdempotencyStore(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Default")!;
    }

    public async Task<byte[]?> FindAsync(string key, CancellationToken ct = default)
    {
        await using var conn = new SqlConnection(_connectionString);
        return await conn.ExecuteScalarAsync<byte[]?>(
            "SELECT Value FROM IdempotencyStore WHERE [Key] = @Key AND ExpiresAt > GETUTCDATE()",
            new { Key = key });
    }

    public async Task StoreAsync(string key, byte[] value, TimeSpan expiration, CancellationToken ct = default)
    {
        await using var conn = new SqlConnection(_connectionString);
        await conn.ExecuteAsync(
            @"MERGE IdempotencyStore AS target
              USING (SELECT @Key, @Value, @ExpiresAt) AS source ([Key], Value, ExpiresAt)
              ON target.[Key] = source.[Key]
              WHEN MATCHED THEN UPDATE SET Value = @Value, ExpiresAt = @ExpiresAt
              WHEN NOT MATCHED THEN INSERT ([Key], Value, ExpiresAt) VALUES (@Key, @Value, @ExpiresAt);",
            new { Key = key, Value = value, ExpiresAt = DateTime.UtcNow.Add(expiration) });
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        await using var conn = new SqlConnection(_connectionString);
        await conn.ExecuteAsync("DELETE FROM IdempotencyStore WHERE [Key] = @Key", new { Key = key });
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
    {
        return (await FindAsync(key, ct)) is not null;
    }
}
```

## Registration

```csharp
// Redis store
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"]!));
builder.Services.AddSingleton<IIdempotencyStore, RedisIdempotencyStore>();

// Or SQL store
builder.Services.AddScoped<IIdempotencyStore, SqlIdempotencyStore>();
```

:::tip
For high-availability deployments, use Redis with persistence enabled to ensure idempotency keys survive restarts. Set the expiration to be at least as long as your client's retry window.
:::
