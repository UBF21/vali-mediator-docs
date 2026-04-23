---
id: dead-letter-queue
title: Cola de Mensajes Muertos
---

import Drawio from '@theme/Drawio';
import deadLetterQueue from '@site/static/diagrams/dead-letter-queue.drawio';

# Cola de Mensajes Muertos (Dead Letter Queue)

La Cola de Mensajes Muertos (DLQ) captura fallos de handlers de notificaciones cuando se usa `PublishStrategy.ResilientParallel`, permitiendo inspeccionar, reintentar o alertar sobre fallos sin perderlos.

## Configuración

```csharp
// Program.cs
builder.Services.AddInMemoryDeadLetterQueue();
```

## Cómo Funciona

Con `ResilientParallel`, todos los handlers se ejecutan independientemente de los fallos individuales. Cualquier handler que lance excepción se captura en la DLQ:

<Drawio content={deadLetterQueue} />

## Publicar con ResilientParallel

```csharp
await _mediator.Publish(
    new OrderPlacedEvent(orderId, customerId),
    PublishStrategy.ResilientParallel);
```

## Inspeccionar la DLQ

```csharp
public class DlqMonitoringService
{
    private readonly InMemoryDeadLetterQueue _dlq;

    public DlqMonitoringService(IDeadLetterQueue dlq)
    {
        // Cast para acceder a GetEntries()
        _dlq = (InMemoryDeadLetterQueue)dlq;
    }

    public void PrintFailures()
    {
        IReadOnlyList<DeadLetterEntry> entries = _dlq.GetEntries();

        foreach (var entry in entries)
        {
            Console.WriteLine($"Handler: {entry.HandlerType.Name}");
            Console.WriteLine($"Evento: {entry.Notification.GetType().Name}");
            Console.WriteLine($"Error: {entry.Exception.Message}");
            Console.WriteLine($"Hora: {entry.Timestamp}");
        }
    }
}
```

## Estructura de DeadLetterEntry

```csharp
public class DeadLetterEntry
{
    public Type HandlerType { get; }
    public INotification Notification { get; }
    public Exception Exception { get; }
    public DateTimeOffset Timestamp { get; }
}
```

## DLQ Personalizada

Para producción, implementa `IDeadLetterQueue` para persistir fallos en base de datos o cola de mensajes:

```csharp
public class SqlDeadLetterQueue : IDeadLetterQueue
{
    private readonly AppDbContext _db;

    public SqlDeadLetterQueue(AppDbContext db)
    {
        _db = db;
    }

    public async Task EnqueueAsync(
        Type handlerType,
        INotification notification,
        Exception exception,
        CancellationToken ct)
    {
        _db.DeadLetterEntries.Add(new DeadLetterRecord
        {
            HandlerType = handlerType.FullName!,
            NotificationType = notification.GetType().FullName!,
            ErrorMessage = exception.Message,
            OccurredAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);
    }
}
```

:::tip
En producción, usa una DLQ respaldada por almacenamiento persistente para que los fallos sobrevivan reinicios de la aplicación y puedan ser reproducidos.
:::
