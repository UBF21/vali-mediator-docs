---
id: circuit-breaker
title: Cortocircuito (Circuit Breaker)
---

import Drawio from '@theme/Drawio';
import circuitBreaker from '@site/static/diagrams/circuit-breaker.drawio';

# Cortocircuito (Circuit Breaker)

El circuit breaker previene llamar repetidamente a un servicio que está fallando. Después de un umbral de fallos, "abre" el circuito y falla rápido las solicitudes hasta que el servicio tenga tiempo de recuperarse.

## Diagrama de Estados

<Drawio content={circuitBreaker} />

## Uso Básico

```csharp
var policy = ResiliencePolicy.Create()
    .CircuitBreaker(opts =>
    {
        opts.FailureThreshold = 5;           // abrir después de 5 fallos
        opts.MinimumThroughput = 10;         // necesitar al menos 10 llamadas en la ventana
        opts.SamplingDurationMs = 30_000;    // ventana deslizante: 30 segundos
        opts.BreakDuration = TimeSpan.FromSeconds(60); // permanecer abierto 60s
    })
    .Build();
```

## Estado de Circuito Compartido

```csharp
// Todos los handlers que llaman al servicio de inventario comparten un circuito
var inventoryPolicy = ResiliencePolicy.Create()
    .CircuitBreaker(opts =>
    {
        opts.CircuitKey = "inventory-service"; // clave compartida
        opts.FailureThreshold = 10;
        opts.BreakDuration = TimeSpan.FromSeconds(30);
    })
    .Build();
```

## Callbacks

```csharp
.CircuitBreaker(opts =>
{
    opts.FailureThreshold = 5;
    opts.BreakDuration = TimeSpan.FromSeconds(30);

    opts.OnBreak = context =>
    {
        _logger.LogWarning("Circuito ABIERTO: {Error}", context.Exception?.Message);
        return Task.CompletedTask;
    };

    opts.OnReset = () =>
    {
        _logger.LogInformation("Circuito CERRADO — servicio recuperado");
        return Task.CompletedTask;
    };
})
```

:::warning
Cuando el circuito está **Abierto**, las llamadas lanzan `CircuitBreakerOpenException` inmediatamente sin ejecutar la operación. Combina con una política **Fallback** para manejar esto de forma elegante.
:::
