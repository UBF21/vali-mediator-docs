---
id: overview
title: Patrón Result
---

# Patrón Result

Vali-Mediator incluye un **patrón Result** integrado que modela el éxito y el fallo como valores, eliminando la necesidad de lanzar excepciones para fallos de lógica de negocio esperados.

## Tipos Principales

| Tipo | Descripción |
|------|-------------|
| `Result<T>` | Un result que lleva un valor `T` en caso de éxito |
| `Result` | Un result void (sin valor en caso de éxito) |
| `IResult` | Interfaz implementada por ambos — usada por el pipeline y la resiliencia |

Ambos son **readonly structs** — sin overhead de alocación.

## Crear Results

### Éxito

```csharp
// Con valor
Result<string> ok = Result<string>.Ok("order-123");
Result<ProductDto> ok = Result<ProductDto>.Ok(new ProductDto(...));

// Void (sin valor)
Result success = Result.Ok();
```

### Fallo

```csharp
// Mensaje de error simple
Result<string> fail = Result<string>.Fail("Producto no encontrado.", ErrorType.NotFound);

// Errores de validación (diccionario de campo → lista de errores)
var errors = new Dictionary<string, IReadOnlyList<string>>
{
    { "Name", new[] { "El nombre es requerido." } },
    { "Price", new[] { "El precio debe ser positivo." } }
};
Result<ProductDto> validationFail = Result<ProductDto>.Fail(errors, ErrorType.Validation);

// Fallo void
Result fail = Result.Fail("No autorizado.", ErrorType.Unauthorized);
```

## Consumir Results

```csharp
Result<ProductDto> result = await _mediator.Send(new GetProductQuery(productId));

if (result.IsSuccess)
{
    Console.WriteLine($"Producto: {result.Value.Name}");
}
else
{
    Console.WriteLine($"Error ({result.ErrorType}): {result.Error}");
}
```

## Propiedades Clave

```csharp
public readonly struct Result<T>
{
    public bool IsSuccess { get; }
    public bool IsFailure { get; }
    public T Value { get; }           // lanza excepción si IsFailure
    public string Error { get; }      // null si IsSuccess
    public ErrorType ErrorType { get; }
    public IReadOnlyDictionary<string, IReadOnlyList<string>>? ValidationErrors { get; }
}
```

## Conversión Implícita

`Result<T>` soporta conversión implícita desde `T`:

```csharp
public Task<Result<string>> Handle(CreateOrderCommand req, CancellationToken ct)
{
    // Envuelve implícitamente el string en Result<string>.Ok(...)
    return Task.FromResult<Result<string>>("new-order-id");
}
```

## Match

```csharp
string message = result.Match(
    onSuccess: value => $"Creado: {value}",
    onFailure: (error, errorType) => $"Falló: {error}"
);
```
