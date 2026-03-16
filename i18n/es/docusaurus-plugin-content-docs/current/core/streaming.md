---
id: streaming
title: Streaming
---

# Streaming

Vali-Mediator soporta respuestas de streaming vía `IAsyncEnumerable<T>`, permitiendo entrega de datos en tiempo real sin cargar todos los resultados en memoria.

## Definir una Solicitud de Stream

```csharp
public record GetProductsStreamRequest(string Category) : IStreamRequest<ProductDto>;
```

## Implementar el Handler

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

## Consumir el Stream

```csharp
IAsyncEnumerable<ProductDto> stream = _mediator.CreateStream(
    new GetProductsStreamRequest("Electronics"));

await foreach (var product in stream.WithCancellation(cancellationToken))
{
    Console.WriteLine($"{product.Name}: {product.Price:C}");
}
```

:::warning
El streaming **omite los pipeline behaviors** por completo. Los pre/post procesadores y behaviors no se ejecutan para solicitudes de stream.
:::

## Casos de Uso

- **Grandes conjuntos de datos** — transmite miles de registros sin presión de memoria
- **Datos en tiempo real** — feed en vivo de lecturas de sensores, eventos o mensajes
- **Server-Sent Events** — combinar con endpoints SSE de ASP.NET Core
