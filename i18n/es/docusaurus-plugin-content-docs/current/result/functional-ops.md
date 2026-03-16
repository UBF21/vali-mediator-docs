---
id: functional-ops
title: Operaciones Funcionales
---

# Operaciones Funcionales

`Result<T>` y `Result` soportan métodos de composición funcional que permiten **programación orientada a ferrocarriles** — encadenar operaciones donde un fallo en cualquier paso cortocircuita el resto.

## Map

Transforma el valor dentro de un result exitoso. En caso de fallo, propaga el error sin cambios.

```csharp
Result<string> orderId = Result<string>.Ok("order-42");
Result<int> orderNumber = orderId.Map(id => int.Parse(id.Split('-')[1]));
// Result<int>.Ok(42)
```

## Bind

Encadena operaciones que retornan `Result<T>`. Habilita composición sin sentencias if anidadas.

```csharp
Result<OrderDto> result = await GetOrderAsync(orderId)
    .Bind(order => ValidateOrder(order))
    .Bind(order => EnrichWithCustomer(order));
```

## MapAsync / BindAsync

Versiones async para transformaciones asíncronas:

```csharp
Result<string> result = await Result<Guid>.Ok(productId)
    .MapAsync(async id =>
    {
        var product = await _repository.GetAsync(id);
        return product.Name;
    });
```

## Tap

Ejecuta un efecto secundario en caso de éxito sin cambiar el result. Útil para logging o publicar eventos.

```csharp
result.Tap(orderId =>
{
    _logger.LogInformation("Orden creada: {OrderId}", orderId);
});
```

## OnFailure

Ejecuta un efecto secundario en caso de fallo. Útil para logging de errores.

```csharp
result.OnFailure((error, errorType) =>
{
    _logger.LogWarning("Falló al obtener producto: {Error} ({ErrorType})", error, errorType);
});
```

## Match

Branching exhaustivo — provee un handler para ambos casos de éxito y fallo:

```csharp
string message = result.Match(
    onSuccess: product => $"Encontrado: {product.Name}",
    onFailure: (error, errorType) => $"Error: {error}"
);
```

## Ejemplo de Encadenamiento

```csharp
public async Task<Result<OrderConfirmationDto>> PlaceOrder(PlaceOrderCommand command)
{
    return await ValidateInventory(command)
        .BindAsync(async _ => await ReserveStock(command))
        .BindAsync(async _ => await ChargePayment(command))
        .BindAsync(async _ => await CreateOrder(command))
        .MapAsync(async orderId => await BuildConfirmation(orderId))
        .Tap(confirmation =>
            _logger.LogInformation("Orden {Id} creada", confirmation.OrderId))
        .OnFailure((error, type) =>
            _logger.LogWarning("Orden falló: {Error}", error));
}
```
