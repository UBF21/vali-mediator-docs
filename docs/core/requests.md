---
id: requests
title: Requests & Commands
---

import Drawio from '@theme/Drawio';
import requestFlow from '@site/static/diagrams/request-flow.drawio';

# Requests & Commands

Requests are the primary dispatch mechanism in Vali-Mediator. Each request has **exactly one handler**.

## Request Flow

<Drawio content={requestFlow} />

## Defining Requests

### With a Response

```csharp
// A query that returns data
public record GetProductQuery(Guid ProductId) : IRequest<Result<ProductDto>>;

// A command that returns a created ID
public record CreateProductCommand(string Name, decimal Price) : IRequest<Result<Guid>>;
```

### Void Requests

For operations with no meaningful return value, use `IRequest` (shorthand for `IRequest<Unit>`):

```csharp
public record DeleteProductCommand(Guid ProductId) : IRequest;

// Or explicitly:
public record DeleteProductCommand(Guid ProductId) : IRequest<Unit>;
```

## Implementing Handlers

### Handler with Response

```csharp
public class GetProductHandler : IRequestHandler<GetProductQuery, Result<ProductDto>>
{
    private readonly IProductRepository _repository;

    public GetProductHandler(IProductRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<ProductDto>> Handle(
        GetProductQuery request,
        CancellationToken cancellationToken)
    {
        var product = await _repository.FindByIdAsync(request.ProductId, cancellationToken);

        if (product is null)
            return Result<ProductDto>.Fail("Product not found.", ErrorType.NotFound);

        return Result<ProductDto>.Ok(new ProductDto(product.Id, product.Name, product.Price));
    }
}
```

### Void Handler

Use the shorthand `IRequestHandler<TRequest>` which implements `IRequestHandler<TRequest, Unit>`:

```csharp
public class DeleteProductHandler : IRequestHandler<DeleteProductCommand>
{
    private readonly IProductRepository _repository;

    public DeleteProductHandler(IProductRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(
        DeleteProductCommand request,
        CancellationToken cancellationToken)
    {
        await _repository.DeleteAsync(request.ProductId, cancellationToken);
        return Unit.Value;
    }
}
```

## Sending Requests

```csharp
// Standard send
Result<ProductDto> result = await _mediator.Send(new GetProductQuery(productId));

// Void request
await _mediator.Send(new DeleteProductCommand(productId));
```

## SendOrDefault

Returns `default` instead of throwing when no handler is registered:

```csharp
// Returns null if no handler exists for GetProductQuery
ProductDto? product = await _mediator.SendOrDefault(new GetProductQuery(productId));
```

:::note
`SendOrDefault` is useful for optional features or plugin-based architectures where a handler may or may not be registered.
:::

## SendAll

Execute multiple requests of the same response type in parallel:

```csharp
var queries = new[]
{
    new GetProductQuery(id1),
    new GetProductQuery(id2),
    new GetProductQuery(id3),
};

// All 3 execute concurrently via Task.WhenAll
Result<ProductDto>[] results = await _mediator.SendAll(queries);
```

:::warning
`SendAll` uses `Task.WhenAll` internally. If any request throws an unhandled exception, the whole operation fails. Use `Result<T>` to handle per-request errors gracefully.
:::

## Handler Registration

Handlers are auto-discovered when you call `RegisterServicesFromAssemblyContaining<T>()`:

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();

    // Or with explicit lifetime (default is Scoped)
    config.RegisterServicesFromAssembly(
        typeof(Infrastructure.Marker).Assembly,
        ServiceLifetime.Transient);
});
```
