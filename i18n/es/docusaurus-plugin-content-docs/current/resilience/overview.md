---
id: overview
title: Resumen de Resiliencia
---

# Resiliencia

`Vali-Mediator.Resilience` proporciona un pipeline de resiliencia fluido y componible sin dependencias externas.

## Instalación

```bash
dotnet add package Vali-Mediator.Resilience
```

## Orden de Ejecución

Cuando se combinan múltiples políticas, se ejecutan en este orden fijo (más externo → más interno):

```mermaid
graph LR
    Call["Tu Llamada"] --> Fallback
    Fallback --> Chaos["Chaos"]
    Chaos --> RateLimit["Rate Limiter"]
    RateLimit --> Timeout["Timeout"]
    Timeout --> CB["Circuit Breaker"]
    CB --> Bulkhead["Bulkhead"]
    Bulkhead --> Retry["Retry"]
    Retry --> Hedge["Hedge"]
    Hedge --> Handler["Tu Handler"]
```

**Fallback** siempre es el más externo — captura fallos de todas las políticas internas.
**Hedge** es el más interno — ejecuta la operación real (potencialmente en paralelo).

## Crear una Política

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(3)
    .CircuitBreaker(opts =>
    {
        opts.FailureThreshold = 5;
        opts.BreakDuration = TimeSpan.FromSeconds(30);
    })
    .Timeout(TimeSpan.FromSeconds(10))
    .Build();

// Ejecutar
string result = await policy.ExecuteAsync<string>(async ct =>
{
    return await _httpClient.GetStringAsync(url, ct);
});
```

## Presets de Resiliencia

Políticas preconfiguradas para escenarios comunes:

```csharp
// Para llamadas a APIs externas (Retry + CircuitBreaker + Timeout)
var policy = ResiliencePresets.ForExternalApi();

// Para operaciones de base de datos
var policy = ResiliencePresets.ForDatabase();

// Para operaciones críticas (Retry + CircuitBreaker + Fallback)
var policy = ResiliencePresets.ForCritical(fallbackValue: "default");

// Sin resiliencia (passthrough)
var policy = ResiliencePresets.NoResilience();
```

## Políticas Disponibles

| Política | Método | Propósito |
|----------|--------|-----------|
| Retry | `.Retry(n)` | Reintentar en fallos transitorios |
| Circuit Breaker | `.CircuitBreaker(opts)` | Detener llamadas cuando la tasa de error es alta |
| Timeout | `.Timeout(ts)` | Cancelar operaciones lentas |
| Bulkhead | `.Bulkhead(n, q)` | Limitar solicitudes concurrentes |
| Hedge | `.Hedge(delay)` | Solicitudes especulativas paralelas |
| Rate Limiter | `.RateLimiter(cap)` | Limitar tasa de solicitudes |
| Chaos | `.Chaos(rate)` | Inyectar fallos para pruebas |
| Fallback | `.Fallback<T>(opts)` | Retornar valor por defecto cuando todo falla |
