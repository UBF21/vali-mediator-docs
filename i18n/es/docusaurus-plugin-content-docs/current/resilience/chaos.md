---
id: chaos
title: Ingeniería de Caos
---

# Ingeniería de Caos

La política de caos inyecta fallos (excepciones, latencia o resultados sintéticos) en tu pipeline de ejecución. Úsala en pruebas para validar que tus políticas de resiliencia y manejo de errores funcionan correctamente bajo condiciones adversas.

## Tipos de Fallo (por Prioridad)

1. **Inyección de excepción** — lanza una excepción especificada
2. **Inyección de latencia** — agrega retardo artificial (luego ejecuta normalmente)
3. **Resultado sintético** — retorna un valor falso sin ejecutar la operación

## Uso Básico

```csharp
// 30% de probabilidad de inyectar un fallo
var policy = ResiliencePolicy.Create()
    .Chaos(0.3, opts =>
    {
        opts.ExceptionFactory = () => new HttpRequestException("Fallo inyectado");
    })
    .Build();
```

## Inyección de Latencia

```csharp
// Siempre inyectar 500ms de latencia, luego ejecutar normalmente
.Chaos(1.0, opts =>
{
    opts.LatencyInjection = TimeSpan.FromMilliseconds(500);
})
```

## Resultado Sintético

```csharp
// 50% de probabilidad de retornar un resultado sintético
.Chaos(0.5, opts =>
{
    opts.ResultFactory = requestType => "synthetic-cached-response";
})
```

## Pruebas Determinísticas

```csharp
// Siempre dispara (0.0 < 0.5)
var alwaysFire = new FixedRandom(0.0);

var policy = ResiliencePolicy.Create()
    .Chaos(opts =>
    {
        opts.InjectionRate = 0.5;
        opts.Random = alwaysFire; // determinístico para pruebas
        opts.ExceptionFactory = () => new Exception("caos determinístico");
    })
    .Build();

private sealed class FixedRandom : Random
{
    private readonly double _value;
    public FixedRandom(double value) : base(0) => _value = value;
    public override double NextDouble() => _value;
}
```

:::warning
Nunca uses la política de caos en producción sin un feature flag o verificación de entorno. Envuélvela en una condición:
```csharp
if (!_env.IsProduction())
    policy = policy.WithChaos(0.1, opts => ...);
```
:::
