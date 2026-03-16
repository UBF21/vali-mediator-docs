---
id: requests
title: Solicitudes y Comandos
---

# Solicitudes y Comandos

Las solicitudes son el mecanismo principal de despacho en Vali-Mediator. Cada solicitud tiene **exactamente un handler**.

## Definir Solicitudes

### Con Respuesta

```csharp
// Una consulta que retorna datos
public record GetProductQuery(Guid ProductId) : IRequest<Result<ProductDto>>;

// Un comando que retorna un ID creado
public record CreateProductCommand(string Name, decimal Price) : IRequest<Result<Guid>>;
```

### Solicitudes Void

Para operaciones sin valor de retorno, usa `IRequest` (atajo de `IRequest<Unit>`):

```csharp
public record DeleteProductCommand(Guid ProductId) : IRequest;
```

## Implementar Handlers

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
            return Result<ProductDto>.Fail("Producto no encontrado.", ErrorType.NotFound);

        return Result<ProductDto>.Ok(new ProductDto(product.Id, product.Name, product.Price));
    }
}
```

### Handler Void

```csharp
public class DeleteProductHandler : IRequestHandler<DeleteProductCommand>
{
    public async Task<Unit> Handle(DeleteProductCommand request, CancellationToken ct)
    {
        await _repository.DeleteAsync(request.ProductId, ct);
        return Unit.Value;
    }
}
```

## SendOrDefault

Retorna `default` en lugar de lanzar excepción cuando no hay handler registrado:

```csharp
ProductDto? product = await _mediator.SendOrDefault(new GetProductQuery(productId));
```

## SendAll

Ejecuta múltiples solicitudes del mismo tipo de respuesta en paralelo:

```csharp
var queries = new[]
{
    new GetProductQuery(id1),
    new GetProductQuery(id2),
    new GetProductQuery(id3),
};

Result<ProductDto>[] results = await _mediator.SendAll(queries);
```
