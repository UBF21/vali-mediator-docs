---
id: error-types
title: Error Types
---

# Error Types

The `ErrorType` enum classifies failures and maps directly to HTTP status codes when using `Vali-Mediator.AspNetCore`.

## ErrorType Enum

```csharp
public enum ErrorType
{
    None = 0,           // Success
    Validation = 1,     // 400 Bad Request
    NotFound = 2,       // 404 Not Found
    Conflict = 3,       // 409 Conflict
    Unauthorized = 4,   // 401 Unauthorized
    Forbidden = 5,      // 403 Forbidden
    Failure = 6,        // 500 Internal Server Error
}
```

## HTTP Status Code Mapping

| ErrorType | HTTP Status | Use Case |
|-----------|------------|----------|
| `None` (success) on `Result<T>` | `200 OK` | Value returned |
| `None` (success) on `Result` | `204 No Content` | Void success |
| `Validation` | `400 Bad Request` | Input validation failed |
| `NotFound` | `404 Not Found` | Resource doesn't exist |
| `Conflict` | `409 Conflict` | Duplicate or state conflict |
| `Unauthorized` | `401 Unauthorized` | Not authenticated |
| `Forbidden` | `403 Forbidden` | Not authorized for this resource |
| `Failure` | `500 Internal Server Error` | Unexpected server-side error |

## Usage Examples

### Validation

```csharp
public async Task<Result<Guid>> Handle(CreateProductCommand req, CancellationToken ct)
{
    if (string.IsNullOrWhiteSpace(req.Name))
    {
        var errors = new Dictionary<string, IReadOnlyList<string>>
        {
            { "Name", new[] { "Product name is required." } }
        };
        return Result<Guid>.Fail(errors, ErrorType.Validation);
    }

    // ...
}
```

### NotFound

```csharp
public async Task<Result<ProductDto>> Handle(GetProductQuery req, CancellationToken ct)
{
    var product = await _repo.FindByIdAsync(req.Id, ct);

    if (product is null)
        return Result<ProductDto>.Fail($"Product '{req.Id}' was not found.", ErrorType.NotFound);

    return Result<ProductDto>.Ok(product.ToDto());
}
```

### Conflict

```csharp
public async Task<Result<Guid>> Handle(CreateUserCommand req, CancellationToken ct)
{
    if (await _repo.ExistsByEmailAsync(req.Email, ct))
        return Result<Guid>.Fail($"A user with email '{req.Email}' already exists.", ErrorType.Conflict);

    // ...
}
```

### Unauthorized / Forbidden

```csharp
// Not authenticated (no valid credentials)
return Result<OrderDto>.Fail("Authentication required.", ErrorType.Unauthorized);

// Authenticated but not allowed
return Result<OrderDto>.Fail("You don't have permission to view this order.", ErrorType.Forbidden);
```

### Failure (Unexpected Errors)

```csharp
public async Task<Result<string>> Handle(ProcessPaymentCommand req, CancellationToken ct)
{
    try
    {
        var txId = await _paymentGateway.ChargeAsync(req.Amount, req.CardToken, ct);
        return Result<string>.Ok(txId);
    }
    catch (PaymentGatewayException ex)
    {
        _logger.LogError(ex, "Payment gateway error for order {OrderId}", req.OrderId);
        return Result<string>.Fail("Payment processing failed. Please try again.", ErrorType.Failure);
    }
}
```

## Checking Error Type

```csharp
Result<ProductDto> result = await _mediator.Send(query);

switch (result.ErrorType)
{
    case ErrorType.None:
        return Ok(result.Value);
    case ErrorType.NotFound:
        return NotFound(result.Error);
    case ErrorType.Validation:
        return ValidationProblem(result.ValidationErrors);
    default:
        return StatusCode(500, result.Error);
}
```

:::tip
With `Vali-Mediator.AspNetCore`, you don't need the switch statement above — just call `result.ToActionResult()` and it handles all cases automatically.
:::
