---
id: overview
title: Result Pattern
---

import Drawio from '@theme/Drawio';
import resultFlow from '@site/static/diagrams/result-flow.drawio';

# Result Pattern

Vali-Mediator includes a built-in **Result pattern** that models success and failure as values, eliminating the need to throw exceptions for expected business logic failures.

## Core Types

| Type | Description |
|------|-------------|
| `Result<T>` | A result carrying a value `T` on success |
| `Result` | A void result (no value on success) |
| `IResult` | Interface implemented by both — used by pipeline and resilience |

Both are **readonly structs** — zero allocation overhead.

## Creating Results

### Success

```csharp
// With a value
Result<string> ok = Result<string>.Ok("order-123");
Result<ProductDto> ok = Result<ProductDto>.Ok(new ProductDto(...));

// Void (no value)
Result success = Result.Ok();
```

### Failure

```csharp
// Simple error message
Result<string> fail = Result<string>.Fail("Product not found.", ErrorType.NotFound);

// Validation errors (dictionary of field → list of errors)
var errors = new Dictionary<string, IReadOnlyList<string>>
{
    { "Name", new[] { "Name is required." } },
    { "Price", new[] { "Price must be positive.", "Price must be a number." } }
};
Result<ProductDto> validationFail = Result<ProductDto>.Fail(errors, ErrorType.Validation);

// Void failure
Result fail = Result.Fail("Unauthorized.", ErrorType.Unauthorized);
```

## Consuming Results

```csharp
Result<ProductDto> result = await _mediator.Send(new GetProductQuery(productId));

if (result.IsSuccess)
{
    Console.WriteLine($"Product: {result.Value.Name}");
}
else
{
    Console.WriteLine($"Error ({result.ErrorType}): {result.Error}");
}
```

## Key Properties

```csharp
public readonly struct Result<T>
{
    public bool IsSuccess { get; }
    public bool IsFailure { get; }
    public T Value { get; }           // throws if IsFailure
    public string Error { get; }      // null if IsSuccess
    public ErrorType ErrorType { get; }
    public IReadOnlyDictionary<string, IReadOnlyList<string>>? ValidationErrors { get; }
}
```

## Implicit Conversion

`Result<T>` supports implicit conversion from `T`:

```csharp
public Task<Result<string>> Handle(CreateOrderCommand req, CancellationToken ct)
{
    // Implicitly wraps the string in Result<string>.Ok(...)
    return Task.FromResult<Result<string>>("new-order-id");
}
```

## Pattern: Match

The `Match` method provides exhaustive branching:

```csharp
string message = result.Match(
    onSuccess: value => $"Created: {value}",
    onFailure: (error, errorType) => $"Failed: {error}"
);
```

## Result Flow

<Drawio content={resultFlow} />

:::tip
Return `Result<T>` from handlers instead of throwing exceptions for business logic failures. Reserve exceptions for unexpected runtime errors (null references, IO failures, etc.).
:::
