using Tokin.CarService.Domain.Requests;

namespace Tokin.CarService.Domain.Workflow;

public enum OutboxStatus
{
    Unknown = 0,
    Pending,
    Processing,
    Delivered,
    Failed,
    DeadLetter,
}

public enum DeliveryStatus
{
    Unknown = 0,
    Delivered,
    Failed,
}

public sealed class WorkflowOutboxMessage
{
    public Guid Id { get; set; }
    public Guid? TransportRequestId { get; set; }
    public TransportRequest? TransportRequest { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int SchemaVersion { get; set; } = 1;
    public string DeduplicationKey { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public OutboxStatus Status { get; set; } = OutboxStatus.Pending;
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; } = 8;
    public DateTimeOffset AvailableAtUtc { get; set; }
    public DateTimeOffset? LockedAtUtc { get; set; }
    public Guid? LockedBy { get; set; }
    public DateTimeOffset? DeliveredAtUtc { get; set; }
    public string? LastError { get; set; }
    public Guid CorrelationId { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public ICollection<WorkflowDelivery> Deliveries { get; } = new List<WorkflowDelivery>();
}

public sealed class WorkflowDelivery
{
    public Guid Id { get; set; }
    public Guid OutboxMessageId { get; set; }
    public WorkflowOutboxMessage OutboxMessage { get; set; } = null!;
    public int AttemptNumber { get; set; }
    public string Channel { get; set; } = string.Empty;
    public DeliveryStatus Status { get; set; }
    public string? ProviderRunId { get; set; }
    public int? HttpStatus { get; set; }
    public string? SanitizedError { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset CompletedAtUtc { get; set; }
    public DateTimeOffset? NextRetryAtUtc { get; set; }
}
