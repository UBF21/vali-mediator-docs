---
id: streaming
title: Streaming
---

# Streaming

Vali-Mediator supports streaming responses via `IAsyncEnumerable<T>`, enabling real-time data delivery without loading all results into memory.

## Defining a Stream Request

```csharp
public record GetProductsStreamRequest(string Category) : IStreamRequest<ProductDto>;
```

## Implementing the Handler

```csharp
public class GetProductsStreamHandler
    : IStreamRequestHandler<GetProductsStreamRequest, ProductDto>
{
    private readonly IProductRepository _repository;

    public GetProductsStreamHandler(IProductRepository repository)
    {
        _repository = repository;
    }

    public async IAsyncEnumerable<ProductDto> Handle(
        GetProductsStreamRequest request,
        [EnumeratorCancellation] CancellationToken ct)
    {
        await foreach (var product in _repository.StreamByCategory(request.Category, ct))
        {
            yield return new ProductDto(product.Id, product.Name, product.Price);
        }
    }
}
```

## Consuming the Stream

Use `CreateStream` on the mediator:

```csharp
IAsyncEnumerable<ProductDto> stream = _mediator.CreateStream(
    new GetProductsStreamRequest("Electronics"));

await foreach (var product in stream.WithCancellation(cancellationToken))
{
    Console.WriteLine($"{product.Name}: {product.Price:C}");
}
```

## Minimal API Example

```csharp
app.MapGet("/products/stream", async (
    string category,
    IValiMediator mediator,
    CancellationToken ct) =>
{
    async IAsyncEnumerable<ProductDto> GetProducts()
    {
        await foreach (var p in mediator.CreateStream(
            new GetProductsStreamRequest(category)).WithCancellation(ct))
        {
            yield return p;
        }
    }

    return Results.Ok(GetProducts());
});
```

:::warning
Streaming **bypasses pipeline behaviors** entirely. Pre/post processors and behaviors are not executed for stream requests. If you need cross-cutting concerns, implement them directly in the handler.
:::

## Use Cases

- **Large datasets** — stream thousands of records without memory pressure
- **Real-time data** — live feed of sensor readings, events, or messages
- **Server-Sent Events** — pair with ASP.NET Core SSE endpoints
- **Progress reporting** — yield progress updates as a long task completes
