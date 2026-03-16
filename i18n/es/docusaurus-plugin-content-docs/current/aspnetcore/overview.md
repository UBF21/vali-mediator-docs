---
id: overview
title: Integración ASP.NET Core
---

# Integración ASP.NET Core

`Vali-Mediator.AspNetCore` mapea los valores `Result<T>` y `Result` a respuestas HTTP automáticamente.

## Instalación

```bash
dotnet add package Vali-Mediator.AspNetCore
```

## Mapeo de Códigos de Estado HTTP

| Escenario | HTTP Status |
|-----------|------------|
| `Result<T>.Ok(value)` | `200 OK` con valor en el cuerpo |
| `Result.Ok()` (void) | `204 No Content` |
| `ErrorType.Validation` | `400 Bad Request` con `ValidationProblemDetails` |
| `ErrorType.NotFound` | `404 Not Found` con mensaje de error |
| `ErrorType.Conflict` | `409 Conflict` con mensaje de error |
| `ErrorType.Unauthorized` | `401 Unauthorized` con mensaje de error |
| `ErrorType.Forbidden` | `403 Forbidden` con mensaje de error |
| `ErrorType.Failure` | `500 Internal Server Error` con detalles del problema |

## Controladores MVC

```csharp
using Vali_Mediator.AspNetCore;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IValiMediator _mediator;

    public ProductsController(IValiMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProduct(Guid id)
    {
        Result<ProductDto> result = await _mediator.Send(new GetProductQuery(id));
        return result.ToActionResult();
        // 200 OK con ProductDto, o 404 Not Found
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct(CreateProductRequest body)
    {
        var command = new CreateProductCommand(body.Name, body.Price);
        Result<Guid> result = await _mediator.Send(command);
        return result.ToActionResult();
        // 200 OK con Guid, o 400 Bad Request con ValidationProblemDetails
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        Result result = await _mediator.Send(new DeleteProductCommand(id));
        return result.ToActionResult();
        // 204 No Content, o 404 Not Found
    }
}
```

## Minimal API

```csharp
using Vali_Mediator.AspNetCore;

app.MapGet("/api/products/{id:guid}", async (Guid id, IValiMediator mediator) =>
{
    Result<ProductDto> result = await mediator.Send(new GetProductQuery(id));
    return result.ToHttpResult();
});

app.MapPost("/api/products", async (CreateProductRequest body, IValiMediator mediator) =>
{
    Result<Guid> result = await mediator.Send(
        new CreateProductCommand(body.Name, body.Price));
    return result.ToHttpResult();
});
```

## Formato de Respuesta de Error de Validación

Cuando se retorna `ErrorType.Validation` con un diccionario `ValidationErrors`, la respuesta sigue el formato RFC 7807 `ValidationProblemDetails`:

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Ocurrieron uno o más errores de validación.",
  "status": 400,
  "errors": {
    "Name": ["El nombre es requerido.", "El nombre debe tener máximo 100 caracteres."],
    "Price": ["El precio debe ser mayor a cero."]
  }
}
```
