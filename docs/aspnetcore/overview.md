---
id: overview
title: ASP.NET Core Integration
---

# ASP.NET Core Integration

`Vali-Mediator.AspNetCore` maps `Result<T>` and `Result` values to HTTP responses automatically.

## Installation

```bash
dotnet add package Vali-Mediator.AspNetCore
```

## HTTP Status Code Mapping

| Scenario | HTTP Status |
|----------|------------|
| `Result<T>.Ok(value)` | `200 OK` with value in body |
| `Result.Ok()` (void) | `204 No Content` |
| `ErrorType.Validation` | `400 Bad Request` with `ValidationProblemDetails` |
| `ErrorType.NotFound` | `404 Not Found` with error message |
| `ErrorType.Conflict` | `409 Conflict` with error message |
| `ErrorType.Unauthorized` | `401 Unauthorized` with error message |
| `ErrorType.Forbidden` | `403 Forbidden` with error message |
| `ErrorType.Failure` | `500 Internal Server Error` with problem details |

## MVC Controllers

Use `ToActionResult()` for `IActionResult`:

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
        // 200 OK with ProductDto, or 404 Not Found
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct(CreateProductRequest body)
    {
        var command = new CreateProductCommand(body.Name, body.Price);
        Result<Guid> result = await _mediator.Send(command);
        return result.ToActionResult();
        // 200 OK with Guid, or 400 Bad Request with ValidationProblemDetails
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        Result result = await _mediator.Send(new DeleteProductCommand(id));
        return result.ToActionResult();
        // 204 No Content, or 404 Not Found
    }
}
```

## Minimal API

Use `ToHttpResult()` for `IResult`:

```csharp
using Vali_Mediator.AspNetCore;

var app = builder.Build();

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

app.MapDelete("/api/products/{id:guid}", async (Guid id, IValiMediator mediator) =>
{
    Result result = await mediator.Send(new DeleteProductCommand(id));
    return result.ToHttpResult();
});
```

## Validation Error Response

When `ErrorType.Validation` is returned with a `ValidationErrors` dictionary, the response follows the RFC 7807 `ValidationProblemDetails` format:

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Name": ["Name is required.", "Name must be at most 100 characters."],
    "Price": ["Price must be greater than zero."]
  }
}
```

## IResult Naming Conflict

:::warning
`Microsoft.AspNetCore.Http.IResult` conflicts with `Vali_Mediator.Core.Result.IResult`. The package handles this internally with an alias:

```csharp
// Inside Vali-Mediator.AspNetCore internals
using HttpIResult = Microsoft.AspNetCore.Http.IResult;
```

Your code only needs to reference `Vali_Mediator.AspNetCore` via the extension methods — no alias needed in your own controllers.
:::
