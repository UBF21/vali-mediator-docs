---
id: timeout
title: Behavior de Timeout
---

# Behavior de Timeout

El behavior de timeout integrado cancela solicitudes que excedan un límite de tiempo configurado.

## Configuración

```csharp
// Program.cs
builder.Services.AddTimeoutBehavior();
```

:::note
`AddTimeoutBehavior()` es una extensión de `IServiceCollection`, no de `ValiMediatorConfiguration`.
:::

## Marcar una Solicitud con Timeout

```csharp
public record GetExternalDataQuery(string Endpoint)
    : IRequest<Result<string>>, IHasTimeout
{
    // Timeout en milisegundos
    public int TimeoutMs => 3000; // 3 segundos
}
```

## Comportamiento de Excepción

Cuando el timeout expira, el behavior lanza una **`TimeoutException`**:

```csharp
try
{
    var result = await _mediator.Send(new GetExternalDataQuery("https://slow-api.com/data"));
}
catch (TimeoutException ex)
{
    Console.WriteLine($"La solicitud agotó el tiempo: {ex.Message}");
}
```

:::warning
El behavior de timeout lanza `TimeoutException`, **no** `OperationCanceledException`. Asegúrate de que tus bloques catch manejen el tipo correcto de excepción.
:::

## Cómo Funciona

1. Crea un `CancellationTokenSource` con la duración del timeout
2. Lo vincula con el `CancellationToken` entrante vía `CreateLinkedTokenSource`
3. Pasa el token vinculado al siguiente handler en el pipeline
4. Si el token se activa antes de completar, el handler observa la cancelación
5. Si el handler lanza `OperationCanceledException` y el timeout disparó, lo envuelve como `TimeoutException`
