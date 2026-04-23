---
id: rate-limiter
title: Rate Limiter Policy
---

# Rate Limiter Policy

The rate limiter policy controls how many requests can be made within a time window, protecting downstream services from being overwhelmed.

## Algorithms

| Algorithm | Description |
|-----------|-------------|
| `TokenBucket` | A bucket fills with tokens over time; each request consumes one token |
| `SlidingWindow` | Counts requests in a sliding time window |

## Token Bucket

```csharp
var policy = ResiliencePolicy.Create()
    .RateLimiter(opts =>
    {
        opts.Algorithm = RateLimiterAlgorithm.TokenBucket;
        opts.BucketCapacity = 100;                           // max burst
        opts.TokensPerInterval = 10;                          // replenishment rate
        opts.ReplenishmentInterval = TimeSpan.FromSeconds(1); // every second
    })
    .Build();
```

**Shorthand** (uses token bucket with defaults):

```csharp
var policy = ResiliencePolicy.Create()
    .RateLimiter(bucketCapacity: 100)
    .Build();
```

### Token Bucket Behavior

- Starts full (100 tokens)
- Each request consumes 1 token
- Every second, 10 tokens are added (up to 100 max)
- When bucket is empty → reject

## Sliding Window

```csharp
var policy = ResiliencePolicy.Create()
    .RateLimiter(opts =>
    {
        opts.Algorithm = RateLimiterAlgorithm.SlidingWindow;
        opts.PermitLimit = 100;                  // max requests per window
        opts.Window = TimeSpan.FromMinutes(1);   // window duration
    })
    .Build();
```

## Rejection Handling

When the limit is exceeded, a `RateLimitExceededException` is thrown:

```csharp
try
{
    var result = await policy.ExecuteAsync<string>(async ct =>
        await _api.CallAsync(ct));
}
catch (RateLimitExceededException ex)
{
    _logger.LogWarning(
        "Rate limit exceeded (Algorithm: {Algorithm})",
        ex.Algorithm); // "TokenBucket" or "SlidingWindow"

    // Return 429 Too Many Requests
    return Results.StatusCode(429);
}
```

## OnRejected Callback

```csharp
.RateLimiter(opts =>
{
    opts.Algorithm = RateLimiterAlgorithm.TokenBucket;
    opts.BucketCapacity = 50;
    opts.OnRejected = context =>
    {
        _metrics.IncrementRateLimitHit();
        return Task.CompletedTask;
    };
})
```

## Use Cases

### Outbound API Rate Limiting

Respect a third-party API's rate limits:

```csharp
// GitHub API: 5000 requests/hour
var githubPolicy = ResiliencePolicy.Create()
    .RateLimiter(opts =>
    {
        opts.Algorithm = RateLimiterAlgorithm.SlidingWindow;
        opts.PermitLimit = 5000;
        opts.Window = TimeSpan.FromHours(1);
    })
    .Build();
```

---

## Partitioned Rate Limiting (per user / IP)

By default the rate limiter counts all calls to a command type together. If User A makes 8 requests and User B makes 3, the 11th call fails — regardless of who triggered it.

Use `PartitionKeyResolver` to give each user their own independent counter:

```csharp
services.AddResiliencePolicy<LoginCommand>(req =>
    ResiliencePolicy.Create()
        .RateLimiter(opts =>
        {
            opts.Algorithm = RateLimiterAlgorithm.SlidingWindow;
            opts.PermitLimit = 5;
            opts.Window = TimeSpan.FromMinutes(1);
            // each email gets its own counter
            opts.PartitionKeyResolver = r => ((LoginCommand)r).Email;
        })
        .Build());
```

With a resolver set:
- User A reaches their limit → blocked
- User B is unaffected and can still make requests

### Partition key examples

```csharp
// By user ID
opts.PartitionKeyResolver = r => ((MyCommand)r).UserId;

// By IP (when IP is part of the command)
opts.PartitionKeyResolver = r => ((MyCommand)r).ClientIp;

// By tenant
opts.PartitionKeyResolver = r => ((MyCommand)r).TenantId;
```

:::note
`PartitionKeyResolver` requires the request to be dispatched through `ResilienceBehavior` (standard Vali-Mediator integration). Each unique key creates an independent `RateLimiterState` instance managed internally.
:::
