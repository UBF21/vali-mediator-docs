---
id: send-all
title: SendAll
---

# SendAll

`SendAll` ejecuta múltiples solicitudes del mismo tipo de respuesta en **paralelo** usando `Task.WhenAll`, retornando todos los resultados como un array.

## Uso Básico

```csharp
var queries = new IRequest<Result<ProductDto>>[]
{
    new GetProductQuery(id1),
    new GetProductQuery(id2),
    new GetProductQuery(id3),
};

Result<ProductDto>[] results = await _mediator.SendAll(queries);

foreach (var result in results)
{
    if (result.IsSuccess)
        Console.WriteLine(result.Value.Name);
}
```

## Procesamiento por Lotes

```csharp
public async Task<IActionResult> GetProductsBatch([FromBody] Guid[] productIds)
{
    var queries = productIds.Select(id => new GetProductQuery(id));
    Result<ProductDto>[] results = await _mediator.SendAll(queries);

    var products = results
        .Where(r => r.IsSuccess)
        .Select(r => r.Value)
        .ToList();

    return Ok(products);
}
```

## Comparación: SendAll vs Envío Secuencial

```csharp
// Secuencial — cada uno espera al anterior
var results = new List<Result<ProductDto>>();
foreach (var id in productIds)
{
    results.Add(await _mediator.Send(new GetProductQuery(id)));
}

// Paralelo con SendAll — todas las solicitudes inician al mismo tiempo
Result<ProductDto>[] results = await _mediator.SendAll(
    productIds.Select(id => new GetProductQuery(id)));
```

:::tip
Usa `SendAll` cuando las solicitudes son **independientes** — no dependen entre sí.
:::

:::warning
Si el handler de alguna solicitud lanza una excepción no manejada (no un `Result.Fail`), `SendAll` lanzará un `AggregateException`. Usa `Result<T>` para manejar errores como valores.
:::
