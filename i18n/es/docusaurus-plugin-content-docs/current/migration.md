---
id: migration
title: Guía de Migración
---

# Guía de Migración

## v1.x → v2.0

La versión 2.0 introduce varios cambios que rompen la compatibilidad junto con nuevas características. Sigue esta guía para actualizar.

## Cambios que Rompen Compatibilidad

### 1. IPreProcessor e IPostProcessor ahora retornan Task

**Antes (v1.x):**
```csharp
public class MyPreProcessor : IPreProcessor<MyRequest>
{
    public void Process(MyRequest request, CancellationToken ct)
    {
        // implementación síncrona
    }
}
```

**Después (v2.0):**
```csharp
public class MyPreProcessor : IPreProcessor<MyRequest>
{
    public async Task Process(MyRequest request, CancellationToken ct)
    {
        // implementación async
        await Task.CompletedTask;
    }
}
```

Para implementaciones síncronas, retorna `Task.CompletedTask`:
```csharp
public Task Process(MyRequest request, CancellationToken ct)
{
    // trabajo síncrono aquí
    return Task.CompletedTask;
}
```

### 2. INotificationHandler.Priority ahora tiene implementación por defecto

**Antes (v1.x):** `Priority` era una propiedad abstracta — cada handler debía sobreescribirla.

**Después (v2.0):** `Priority` tiene implementación por defecto `=> 0` — sobreescribe solo cuando es necesario.

```csharp
// v1.x — requerido
public class MyHandler : INotificationHandler<MyEvent>
{
    public int Priority => 0; // debía estar aquí
    public async Task Handle(MyEvent n, CancellationToken ct) { ... }
}

// v2.0 — Priority puede omitirse si es 0
public class MyHandler : INotificationHandler<MyEvent>
{
    public async Task Handle(MyEvent n, CancellationToken ct) { ... }
}
```

## Nuevas Características en v2.0

### Patrón Result

```csharp
// Nuevo en v2.0 — usa Result<T> en lugar de lanzar excepciones
public async Task<Result<ProductDto>> Handle(GetProductQuery req, CancellationToken ct)
{
    var product = await _repo.FindAsync(req.Id, ct);
    if (product is null)
        return Result<ProductDto>.Fail("No encontrado.", ErrorType.NotFound);
    return Result<ProductDto>.Ok(product.ToDto());
}
```

### SendOrDefault

```csharp
// Nuevo en v2.0 — retorna default en lugar de lanzar HandlerNotFoundException
ProductDto? product = await _mediator.SendOrDefault(new GetProductQuery(id));
```

### SendAll

```csharp
// Nuevo en v2.0 — ejecución paralela
Result<ProductDto>[] results = await _mediator.SendAll(queries);
```

### Streaming

```csharp
// Nuevo en v2.0
IAsyncEnumerable<ProductDto> stream = _mediator.CreateStream(new GetProductsStream());
```

### ResilientParallel + Cola de Mensajes Muertos

```csharp
// Nuevo en v2.0
await _mediator.Publish(notification, PublishStrategy.ResilientParallel);
```

### IHasTimeout

```csharp
// Nuevo en v2.0 — timeout declarativo por solicitud
public record SlowQuery() : IRequest<Result<string>>, IHasTimeout
{
    public int TimeoutMs => 5000;
}
```

## Pasos de Migración

1. **Actualizar paquetes** a la versión `2.0.0`
2. **Corregir IPreProcessor/IPostProcessor** — cambiar `void Process(...)` a `Task Process(...)`
3. **Eliminar overrides obligatorios `Priority => 0`** donde no sea necesario (limpieza opcional)
4. **Adoptar `Result<T>`** — refactorizar handlers que lanzan excepciones de negocio
5. **Instalar paquetes de extensión** según sea necesario (Resilience, Caching, etc.)
6. **Agregar behaviors al DI** — `config.AddCachingBehavior()`, etc.

:::tip
La migración puede hacerse incrementalmente. Los handlers sin `Result<T>` siguen funcionando. Adopta el patrón Result handler por handler.
:::
