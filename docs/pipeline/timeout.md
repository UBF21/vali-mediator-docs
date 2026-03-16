---
id: timeout
title: Timeout Behavior
---

# Timeout Behavior

The built-in timeout behavior cancels requests that exceed a configured time limit.

## Setup

Register the timeout behavior from `IServiceCollection`:

```csharp
// Program.cs
builder.Services.AddTimeoutBehavior();
```

:::note
`AddTimeoutBehavior()` is an extension on `IServiceCollection`, not on `ValiMediatorConfiguration`.
:::

## Marking a Request with a Timeout

Implement `IHasTimeout` on your request:

```csharp
public record GetExternalDataQuery(string Endpoint)
    : IRequest<Result<string>>, IHasTimeout
{
    // Timeout in milliseconds
    public int TimeoutMs => 3000; // 3 seconds
}
```

## Handler Example

```csharp
public class GetExternalDataHandler : IRequestHandler<GetExternalDataQuery, Result<string>>
{
    private readonly HttpClient _httpClient;

    public GetExternalDataHandler(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<Result<string>> Handle(
        GetExternalDataQuery request,
        CancellationToken cancellationToken)
    {
        // The cancellationToken passed in is already linked to the timeout
        var response = await _httpClient.GetStringAsync(request.Endpoint, cancellationToken);
        return Result<string>.Ok(response);
    }
}
```

## Exception Behavior

When the timeout expires, the behavior throws a **`TimeoutException`**:

```csharp
try
{
    var result = await _mediator.Send(new GetExternalDataQuery("https://slow-api.com/data"));
}
catch (TimeoutException ex)
{
    Console.WriteLine($"Request timed out: {ex.Message}");
}
```

:::warning
The timeout behavior throws `TimeoutException`, **not** `OperationCanceledException`. Make sure your catch blocks handle the correct exception type.
:::

## How It Works

Internally, the timeout behavior uses `CancellationTokenSource` with a delay:

1. Creates a `CancellationTokenSource` with the timeout duration
2. Links it with the incoming `CancellationToken` via `CreateLinkedTokenSource`
3. Passes the linked token to the next handler in the pipeline
4. If the token fires before completion, the handler observes cancellation
5. If the handler throws `OperationCanceledException` and the timeout fired, it wraps it as `TimeoutException`

## Combining with Resilience Timeout

The pipeline timeout behavior (`IHasTimeout`) and the resilience package's `.Timeout()` policy serve different purposes:

| | `IHasTimeout` | Resilience `.Timeout()` |
|-|--------------|------------------------|
| Scope | Per request type | Per policy execution |
| Configuration | On the request class | On the resilience policy |
| Use case | Declarative, compile-time | Dynamic, runtime |

You can use both together — the resilience timeout wraps the handler execution, and `IHasTimeout` cancels the pipeline-level call.
