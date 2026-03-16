---
id: error-types
title: Tipos de Error
---

# Tipos de Error

El enum `ErrorType` clasifica los fallos y mapea directamente a códigos de estado HTTP cuando se usa `Vali-Mediator.AspNetCore`.

## Enum ErrorType

```csharp
public enum ErrorType
{
    None = 0,           // Éxito
    Validation = 1,     // 400 Bad Request
    NotFound = 2,       // 404 Not Found
    Conflict = 3,       // 409 Conflict
    Unauthorized = 4,   // 401 Unauthorized
    Forbidden = 5,      // 403 Forbidden
    Failure = 6,        // 500 Internal Server Error
}
```

## Mapeo de Código de Estado HTTP

| ErrorType | HTTP Status | Caso de Uso |
|-----------|------------|-------------|
| `None` (éxito) en `Result<T>` | `200 OK` | Valor retornado |
| `None` (éxito) en `Result` | `204 No Content` | Éxito void |
| `Validation` | `400 Bad Request` | Validación de entrada falló |
| `NotFound` | `404 Not Found` | Recurso no existe |
| `Conflict` | `409 Conflict` | Duplicado o conflicto de estado |
| `Unauthorized` | `401 Unauthorized` | No autenticado |
| `Forbidden` | `403 Forbidden` | Sin autorización para este recurso |
| `Failure` | `500 Internal Server Error` | Error inesperado del servidor |

## Ejemplos de Uso

### Validación

```csharp
public async Task<Result<Guid>> Handle(CreateProductCommand req, CancellationToken ct)
{
    if (string.IsNullOrWhiteSpace(req.Name))
    {
        var errors = new Dictionary<string, IReadOnlyList<string>>
        {
            { "Name", new[] { "El nombre del producto es requerido." } }
        };
        return Result<Guid>.Fail(errors, ErrorType.Validation);
    }
    // ...
}
```

### NotFound

```csharp
var product = await _repo.FindByIdAsync(req.Id, ct);
if (product is null)
    return Result<ProductDto>.Fail($"Producto '{req.Id}' no encontrado.", ErrorType.NotFound);
```

### Conflict

```csharp
if (await _repo.ExistsByEmailAsync(req.Email, ct))
    return Result<Guid>.Fail($"Ya existe un usuario con el email '{req.Email}'.", ErrorType.Conflict);
```

### Failure (Errores Inesperados)

```csharp
try
{
    var txId = await _paymentGateway.ChargeAsync(req.Amount, req.CardToken, ct);
    return Result<string>.Ok(txId);
}
catch (PaymentGatewayException ex)
{
    _logger.LogError(ex, "Error de gateway de pago para orden {OrderId}", req.OrderId);
    return Result<string>.Fail("El procesamiento del pago falló. Por favor intenta de nuevo.", ErrorType.Failure);
}
```

:::tip
Con `Vali-Mediator.AspNetCore`, no necesitas un switch manual — simplemente llama a `result.ToActionResult()` y maneja todos los casos automáticamente.
:::
