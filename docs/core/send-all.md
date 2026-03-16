---
id: send-all
title: SendAll
---

# SendAll

`SendAll` executes multiple requests of the same response type in **parallel** using `Task.WhenAll`, returning all results as an array.

## Signature

```csharp
Task<TResponse[]> SendAll<TResponse>(IEnumerable<IRequest<TResponse>> requests, CancellationToken ct = default);
```

## Basic Usage

```csharp
var queries = new IRequest<Result<ProductDto>>[]
{
    new GetProductQuery(id1),
    new GetProductQuery(id2),
    new GetProductQuery(id3),
};

Result<ProductDto>[] results = await _mediator.SendAll(queries);

foreach (var result in results)
{
    if (result.IsSuccess)
        Console.WriteLine(result.Value.Name);
}
```

## Batch Processing

A common pattern is batch-processing a list of IDs:

```csharp
public async Task<IActionResult> GetProductsBatch([FromBody] Guid[] productIds)
{
    var queries = productIds.Select(id => new GetProductQuery(id));
    Result<ProductDto>[] results = await _mediator.SendAll(queries);

    var products = results
        .Where(r => r.IsSuccess)
        .Select(r => r.Value)
        .ToList();

    return Ok(products);
}
```

## Comparison: SendAll vs Sequential Send

```csharp
// Sequential — each waits for the previous
var results = new List<Result<ProductDto>>();
foreach (var id in productIds)
{
    results.Add(await _mediator.Send(new GetProductQuery(id)));
}

// Parallel with SendAll — all requests start at the same time
Result<ProductDto>[] results = await _mediator.SendAll(
    productIds.Select(id => new GetProductQuery(id)));
```

### Performance

For N independent requests:
- **Sequential**: total time ≈ sum of all handler times
- **SendAll**: total time ≈ slowest individual handler

:::tip
Use `SendAll` when the requests are **independent** — they don't rely on each other's results.
:::

:::warning
If any request's handler throws an **unhandled exception** (not a `Result.Fail`), `SendAll` will throw an `AggregateException`. Wrap handler logic in try/catch or use `Result<T>` to return errors as values.
:::
