---
id: overview
title: Resumen de Idempotencia
---

import Drawio from '@theme/Drawio';
import idempotencyFlow from '@site/static/diagrams/idempotency-flow.drawio';

# Idempotencia

`Vali-Mediator.Idempotency` previene el procesamiento duplicado de solicitudes almacenando resultados y retornando resultados cacheados para solicitudes repetidas con la misma clave de idempotencia.

## Instalación

```bash
dotnet add package Vali-Mediator.Idempotency
```

## Configuración

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddIdempotencyBehavior();
});

builder.Services.AddInMemoryIdempotencyStore();
```

## Cómo Funciona

<Drawio content={idempotencyFlow} />

## Marcar una Solicitud como Idempotente

```csharp
public record ProcessPaymentCommand(
    Guid OrderId,
    decimal Amount,
    string CardToken) : IRequest<Result<string>>, IIdempotent
{
    // Clave única para este intento de pago específico
    public string IdempotencyKey => $"payment:{OrderId}";

    // Cuánto tiempo recordar este resultado
    public TimeSpan Expiration => TimeSpan.FromHours(24);
}
```

## Alcance (Scope) por Usuario/Tenant

Retorná la identidad del caller desde `IdempotencyScope` cuando la clave venga del cliente — si no, dos usuarios distintos enviando el mismo valor de clave compartirían la misma respuesta:

```csharp
public record ProcessPaymentCommand(
    Guid OrderId,
    decimal Amount,
    string CardToken,
    string UserId) : IRequest<Result<string>>, IIdempotent
{
    public string IdempotencyKey => $"payment:{OrderId}";
    public TimeSpan Expiration => TimeSpan.FromHours(24);
    public string? IdempotencyScope => UserId;
}
```

## Manejo de un Conflicto de Payload

Se almacena un fingerprint SHA-256 del request serializado junto con la respuesta. Si la misma clave llega de nuevo con un payload *distinto*, el behavior lanza `IdempotencyConflictException` — o, cuando el handler retorna `Result`/`Result<T>`, devuelve directamente un fallo `Conflict` en lugar de lanzar:

```csharp
try
{
    var result = await mediator.Send(command);
}
catch (IdempotencyConflictException ex)
{
    // ex.IdempotencyKey — misma clave, distinto body: responder 409 Conflict
}
```

Desactivá esta verificación (para requests que legítimamente llevan campos volátiles, como un timestamp) con `IdempotencyOptions.VerifyRequestFingerprint = false`.

## Reserva Atómica Entre Instancias

Cuando `SupportsReservation` del store es `true` (el `InMemoryIdempotencyStore` incluido lo es), la clave se reserva *antes* de que el handler corra. Si dos instancias que comparten el mismo store reciben la misma clave al mismo tiempo, solo una ejecuta realmente el handler — la otra espera la reserva y luego repite su resultado en lugar de correr el trabajo dos veces. Esto se verificó con dos procesos reales compartiendo Redis bajo carga.

```csharp
builder.Services.AddIdempotencyOptions(options =>
{
    options.MaxKeyLength = 256;                               // rechaza claves/scopes más largos
    options.VerifyRequestFingerprint = true;                  // desactivar para requests con campos volátiles
    options.ReservationLease = TimeSpan.FromSeconds(30);       // debe superar la duración máxima del handler
    options.ReservationWaitTimeout = TimeSpan.FromSeconds(30); // cuánto espera un caller antes de desistir
});
```

Si otra instancia todavía sostiene la reserva después de `ReservationWaitTimeout`, el caller que espera recibe un `IdempotencyInProgressException`.

## Patrón de Uso con API HTTP

```csharp
app.MapPost("/payments", async (
    [FromHeader(Name = "Idempotency-Key")] string idempotencyKey,
    PaymentRequest body,
    IValiMediator mediator) =>
{
    var command = new ProcessPaymentCommand(
        IdempotencyKey: idempotencyKey,
        Amount: body.Amount,
        Token: body.CardToken);

    Result<PaymentDto> result = await mediator.Send(command);
    return result.ToHttpResult();
});
```

:::tip
Usa UUIDs como claves de idempotencia y deja que los clientes las generen. Esto permite a los clientes reintentar solicitudes fallidas de forma segura sin riesgo de procesamiento doble.
:::

## Serialización

Los resultados se serializan usando `IIdempotencySerializer` (por defecto: `JsonIdempotencySerializer` usando `System.Text.Json`). Los bytes serializados se almacenan en el store de idempotencia.
