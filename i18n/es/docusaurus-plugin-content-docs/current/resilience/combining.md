---
id: combining
title: Combinando Políticas
---

# Combinando Políticas

Las políticas se componen naturalmente en el pipeline de resiliencia. Entender el orden de ejecución es clave para construir combinaciones efectivas.

## Orden de Ejecución Fijo

Independientemente del orden en que las agregues con el builder, las políticas siempre se ejecutan en este orden:

```
Fallback → Chaos → RateLimiter → Timeout → CircuitBreaker → Bulkhead → Retry → Hedge → Handler
```

## Combinaciones Comunes

### API Externa (Lectura)

```csharp
var policy = ResiliencePolicy.Create()
    .Fallback<ApiResponse>(opts =>
    {
        opts.FallbackValue = ApiResponse.Empty;
    })
    .Retry(opts =>
    {
        opts.MaxRetries = 3;
        opts.BackoffType = BackoffType.Exponential;
        opts.DelayMs = 200;
    })
    .CircuitBreaker(opts =>
    {
        opts.CircuitKey = "external-api";
        opts.FailureThreshold = 10;
        opts.BreakDuration = TimeSpan.FromSeconds(60);
    })
    .Timeout(TimeSpan.FromSeconds(10))
    .Build();
```

### Escritura en Base de Datos

```csharp
var policy = ResiliencePolicy.Create()
    .Retry(opts =>
    {
        opts.MaxRetries = 2;
        opts.BackoffType = BackoffType.Linear;
        opts.DelayMs = 100;
        opts.RetryOnExceptions = new[] { typeof(SqlException) };
    })
    .Timeout(TimeSpan.FromSeconds(30))
    .Build();
```

### Lectura de Baja Latencia con Hedge

```csharp
var policy = ResiliencePolicy.Create()
    .Fallback<string>(opts => { opts.FallbackValue = string.Empty; })
    .Timeout(TimeSpan.FromSeconds(2))
    .Hedge(opts =>
    {
        opts.HedgeDelay = TimeSpan.FromMilliseconds(100);
        opts.MaxHedgedAttempts = 1;
    })
    .Build();
```

## Presets de Resiliencia

```csharp
var policy = ResiliencePresets.ForExternalApi();
var policy = ResiliencePresets.ForDatabase();
var policy = ResiliencePresets.ForCritical(fallbackValue: "default");
```

## Consejos de Diseño

:::tip Principios de Diseño
1. **Siempre agrega Fallback** cuando el caller no puede manejar excepciones
2. **CircuitBreaker antes de Retry** (ya forzado por el orden) — el CB previene reintentos contra un circuito abierto
3. **Timeout aplica por intento de retry** — 5s timeout con 3 reintentos = hasta 15s total + backoff
4. **Hedge reduce la latencia P99** — no recuperación de errores
5. **Usa CircuitKey** para compartir estado entre múltiples operaciones al mismo servicio
:::
