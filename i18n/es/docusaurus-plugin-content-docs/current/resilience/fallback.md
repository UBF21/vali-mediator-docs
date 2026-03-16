---
id: fallback
title: Política de Fallback
---

# Política de Fallback

La política de fallback proporciona un **último recurso** cuando todas las demás políticas en el pipeline se han agotado. Siempre es la política más externa, capturando fallos de todas las políticas internas.

## Uso Básico

```csharp
var policy = ResiliencePolicy.Create()
    .Fallback<string>(opts =>
    {
        opts.FallbackValue = "respuesta-por-defecto";
    })
    .Retry(3)
    .Timeout(TimeSpan.FromSeconds(5))
    .Build();
```

## Valor de Fallback Estático

```csharp
.Fallback<string>(opts =>
{
    opts.FallbackValue = "Servicio temporalmente no disponible.";
})
```

## Fábrica de Fallback Dinámica

```csharp
.Fallback<ProductDto>(opts =>
{
    opts.FallbackFactory = context =>
    {
        _logger.LogWarning(
            "Fallback después de {Attempts} intentos: {Error}",
            context.AttemptNumber,
            context.Exception?.Message);

        return new ProductDto { Name = "Desconocido", Price = 0 };
    };
})
```

## Callback OnFallback

```csharp
.Fallback<string>(opts =>
{
    opts.FallbackValue = "cached-default";
    opts.OnFallback = context =>
    {
        _metrics.IncrementFallbackCount();
        return Task.CompletedTask;
    };
})
```

## Patrón Común: Fallback de Caché

```csharp
.Fallback<ProductList>(opts =>
{
    opts.FallbackFactory = _ =>
    {
        return _cache.GetLastKnownGoodProductList()
               ?? new ProductList();
    };
})
```

:::tip
La política de fallback es específica de tipo (`Fallback<T>`). Asegúrate de que el tipo del valor de fallback coincida con el tipo de retorno de tu llamada `ExecuteAsync<T>`.
:::
