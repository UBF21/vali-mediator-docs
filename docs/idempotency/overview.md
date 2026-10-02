---
id: overview
title: Idempotency Overview
---

import Drawio from '@theme/Drawio';
import idempotencyFlow from '@site/static/diagrams/idempotency-flow.drawio';

# Idempotency

`Vali-Mediator.Idempotency` prevents duplicate processing of requests by storing results and returning cached outcomes for repeated requests with the same idempotency key.

## Installation

```bash
dotnet add package Vali-Mediator.Idempotency
```

## Setup

```csharp
builder.Services.AddValiMediator(config =>
{
    config.RegisterServicesFromAssemblyContaining<Program>();
    config.AddIdempotencyBehavior();
});

builder.Services.AddInMemoryIdempotencyStore();
```

## How It Works

<Drawio content={idempotencyFlow} />

## Marking a Request as Idempotent

```csharp
public record ProcessPaymentCommand(
    Guid OrderId,
    decimal Amount,
    string CardToken) : IRequest<Result<string>>, IIdempotent
{
    // Unique key for this specific payment attempt
    public string IdempotencyKey => $"payment:{OrderId}";

    // How long to remember this result
    public TimeSpan Expiration => TimeSpan.FromHours(24);
}
```

## Scoping Keys per User/Tenant

Return the caller's identity from `IdempotencyScope` whenever the key comes from the client — otherwise two different users sending the same key value would share a response:

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

## Handling a Payload Conflict

A SHA-256 fingerprint of the serialized request is stored alongside the response. If the same key arrives again with a *different* payload, the behavior throws `IdempotencyConflictException` — or, when the handler returns `Result`/`Result<T>`, it returns a `Conflict` failure directly instead of throwing:

```csharp
try
{
    var result = await mediator.Send(command);
}
catch (IdempotencyConflictException ex)
{
    // ex.IdempotencyKey — same key, different request body: respond 409 Conflict
}
```

Disable this check (for requests that legitimately carry volatile fields, like a timestamp) with `IdempotencyOptions.VerifyRequestFingerprint = false`.

## Atomic Reservation Across Instances

When the store's `SupportsReservation` is `true` (the built-in `InMemoryIdempotencyStore` does), the key is reserved *before* the handler runs. If two instances sharing the same store receive the same key at the same time, only one actually executes the handler — the other waits for the reservation and then replays its result instead of running the work twice. This was verified with two real processes sharing Redis under load (see the [stress-test methodology](https://github.com/UBF21/Vali-Mediator) for details).

```csharp
builder.Services.AddIdempotencyOptions(options =>
{
    options.MaxKeyLength = 256;                               // rejects longer keys/scopes
    options.VerifyRequestFingerprint = true;                  // disable for volatile-field requests
    options.ReservationLease = TimeSpan.FromSeconds(30);       // must exceed the handler's worst-case duration
    options.ReservationWaitTimeout = TimeSpan.FromSeconds(30); // how long a waiter waits before giving up
});
```

If another instance still holds the reservation after `ReservationWaitTimeout`, the waiting caller gets an `IdempotencyInProgressException`.

## Use Cases

### Payment Processing

```csharp
// Client sends payment request with a client-generated idempotency key
public record ProcessPaymentCommand(string IdempotencyKey, decimal Amount, string Token)
    : IRequest<Result<PaymentDto>>, IIdempotent
{
    string IIdempotent.IdempotencyKey => IdempotencyKey;
    public TimeSpan Expiration => TimeSpan.FromHours(24);
}
```

### Order Creation

```csharp
public record CreateOrderCommand(string ClientRequestId, List<OrderItem> Items)
    : IRequest<Result<Guid>>, IIdempotent
{
    public string IdempotencyKey => $"create-order:{ClientRequestId}";
    public TimeSpan Expiration => TimeSpan.FromMinutes(30);
}
```

## Client Pattern

The API client sends a unique idempotency key in the request:

```csharp
// HTTP API endpoint
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
Use UUIDs as idempotency keys and let clients generate them. This allows clients to safely retry failed requests without risk of double-processing.
:::

## Serialization

Results are serialized using `IIdempotencySerializer` (default: `JsonIdempotencySerializer` using `System.Text.Json`). The serialized bytes are stored in the idempotency store.
