---
id: hedge
title: Política Hedge
---

# Política Hedge

La política hedge inicia una **solicitud especulativa paralela** si la original no se completa dentro de un retardo. La que termine primero gana; las demás se cancelan.

## Uso Básico

```csharp
var policy = ResiliencePolicy.Create()
    .Hedge(TimeSpan.FromMilliseconds(100)) // iniciar hedge si la original tarda > 100ms
    .Build();
```

## Opciones de Configuración

```csharp
var policy = ResiliencePolicy.Create()
    .Hedge(opts =>
    {
        opts.HedgeDelay = TimeSpan.FromMilliseconds(100);
        opts.MaxHedgedAttempts = 2;

        opts.OnHedge = context =>
        {
            _logger.LogDebug("Intento hedge #{Attempt} iniciado", context.AttemptNumber);
            return Task.CompletedTask;
        };
    })
    .Build();
```

## Hedge por Predicado de Resultado

```csharp
var policy = ResiliencePolicy.Create()
    .Hedge(opts =>
    {
        opts.HedgeDelay = TimeSpan.FromMilliseconds(50);
        opts.MaxHedgedAttempts = 1;

        // Hedge si el resultado indica respuesta degradada
        opts.ShouldHedgeOnResult = result =>
            result is string s && s.Contains("degraded");
    })
    .Build();
```

## Manejo de Excepciones

Por defecto, las excepciones de los intentos hedgeados se **suprimen** — si todos los intentos fallan, el ejecutor retorna `default` (null para tipos de referencia):

```csharp
// Comportamiento por defecto: excepciones suprimidas, retorna null en todos los fallos
string? result = await policy.ExecuteAsync<string>(ct =>
    throw new HttpRequestException("Error de red"));
// result == null
```

:::note
La política hedge está optimizada para **reducción de latencia**, no para recuperación de errores. Para recuperación de errores, usa Retry. Combina Retry + Hedge cuando necesitas ambos.
:::

## Ejemplo Completo: Búsqueda de Baja Latencia

```csharp
var searchPolicy = ResiliencePolicy.Create()
    .Hedge(opts =>
    {
        opts.HedgeDelay = TimeSpan.FromMilliseconds(200);
        opts.MaxHedgedAttempts = 1;
    })
    .Timeout(TimeSpan.FromSeconds(2))
    .Build();

SearchResult result = await searchPolicy.ExecuteAsync<SearchResult>(async ct =>
    await _searchService.QueryAsync(query, ct));
```
