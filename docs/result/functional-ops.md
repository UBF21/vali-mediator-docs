---
id: functional-ops
title: Functional Operations
---

# Functional Operations

`Result<T>` and `Result` support functional composition methods that enable **railway-oriented programming** — chaining operations where a failure on any step short-circuits the rest.

## Railway Pattern

```
Input ──► [Validate] ──► [Transform] ──► [Save] ──► Output
              │                │              │
           Failure          Failure        Failure
              └──────────────┴──────────────┘
                          Error Track
```

## Map

Transform the value inside a successful result. On failure, propagates the error unchanged.

```csharp
Result<string> orderId = Result<string>.Ok("order-42");

Result<int> orderNumber = orderId.Map(id => int.Parse(id.Split('-')[1]));
// Result<int>.Ok(42)

Result<string> failed = Result<string>.Fail("Not found", ErrorType.NotFound);
Result<int> stillFailed = failed.Map(id => int.Parse(id));
// Result<int>.Fail("Not found", ErrorType.NotFound) — error passes through
```

## Bind

Chain operations that return `Result<T>`. Enables composition without nested if statements.

```csharp
Result<OrderDto> result = await GetOrderAsync(orderId)
    .Bind(order => ValidateOrder(order))
    .Bind(order => EnrichWithCustomer(order));

// If any step returns a failure, the chain stops and the error propagates
```

## MapAsync / BindAsync

Async versions for async transformations:

```csharp
Result<string> result = await Result<Guid>.Ok(productId)
    .MapAsync(async id =>
    {
        var product = await _repository.GetAsync(id);
        return product.Name;
    });
```

```csharp
Result<OrderDto> result = await GetOrderAsync(orderId)
    .BindAsync(async order => await EnrichOrderAsync(order));
```

## Tap

Execute a side effect on success without changing the result. Useful for logging or publishing events.

```csharp
Result<string> result = await _mediator.Send(new CreateOrderCommand(...));

result.Tap(orderId =>
{
    _logger.LogInformation("Order created: {OrderId}", orderId);
    // Result is passed through unchanged
});
```

## OnFailure

Execute a side effect on failure. Useful for error logging.

```csharp
Result<ProductDto> result = await _mediator.Send(new GetProductQuery(id));

result.OnFailure((error, errorType) =>
{
    _logger.LogWarning("Failed to get product: {Error} ({ErrorType})", error, errorType);
});
```

## Match

Exhaustive branching — provide a handler for both success and failure cases:

```csharp
// Returns a value from either branch
string message = result.Match(
    onSuccess: product => $"Found: {product.Name}",
    onFailure: (error, errorType) => $"Error: {error}"
);

// Use in Minimal API
IResult httpResult = result.Match(
    onSuccess: product => Results.Ok(product),
    onFailure: (error, errorType) => errorType switch
    {
        ErrorType.NotFound => Results.NotFound(error),
        ErrorType.Validation => Results.BadRequest(error),
        _ => Results.Problem(error)
    }
);
```

## Chaining Example

```csharp
public async Task<Result<OrderConfirmationDto>> PlaceOrder(PlaceOrderCommand command)
{
    return await ValidateInventory(command)
        .BindAsync(async _ => await ReserveStock(command))
        .BindAsync(async _ => await ChargePayment(command))
        .BindAsync(async _ => await CreateOrder(command))
        .MapAsync(async orderId => await BuildConfirmation(orderId))
        .Tap(confirmation =>
            _logger.LogInformation("Order {Id} placed", confirmation.OrderId))
        .OnFailure((error, type) =>
            _logger.LogWarning("Order failed: {Error}", error));
}
```

## Available on Result (void)

All methods are also available on non-generic `Result`:

```csharp
Result result = await _mediator.Send(new DeleteProductCommand(id));

result
    .Tap(() => _logger.LogInformation("Product deleted"))
    .OnFailure((error, type) => _logger.LogWarning("Delete failed: {Error}", error));

string message = result.Match(
    onSuccess: () => "Deleted successfully",
    onFailure: (error, _) => $"Failed: {error}"
);
```
