---
id: fire-and-forget
title: Fuego y Olvida
---

# Fuego y Olvida (Fire and Forget)

El patrón fire-and-forget despacha un comando a **exactamente un handler** sin **valor de retorno**. A diferencia de las notificaciones, no hay fan-out — un handler, una operación.

## Definir Comandos Fire-and-Forget

```csharp
public record SendAuditLogCommand(
    string UserId,
    string Action,
    string Resource) : IFireAndForget;
```

## Implementar el Handler

```csharp
public class SendAuditLogHandler : IFireAndForgetHandler<SendAuditLogCommand>
{
    private readonly IAuditRepository _auditRepository;

    public SendAuditLogHandler(IAuditRepository auditRepository)
    {
        _auditRepository = auditRepository;
    }

    public async Task Handle(SendAuditLogCommand command, CancellationToken ct)
    {
        await _auditRepository.LogAsync(new AuditEntry
        {
            UserId = command.UserId,
            Action = command.Action,
            Resource = command.Resource,
            Timestamp = DateTimeOffset.UtcNow
        }, ct);
    }
}
```

## Despachar

Usa `Dispatch` para enviar un comando fire-and-forget:

```csharp
await _mediator.Dispatch(new SendAuditLogCommand(
    userId: currentUser.Id,
    action: "CreateOrder",
    resource: $"orders/{orderId}"));
```

## Casos de Uso Comunes

- **Auditoría** — registrar acciones del usuario sin bloquear el flujo principal
- **Invalidación de caché** — invalidar una entrada de caché de forma asíncrona
- **Telemetría** — enviar métricas o trazas a sistemas externos
- **Webhooks** — disparar una notificación webhook

:::tip
Si necesitas que múltiples handlers reaccionen al mismo evento, usa `INotification` en su lugar. Fire-and-forget es para efectos secundarios de un solo handler.
:::
