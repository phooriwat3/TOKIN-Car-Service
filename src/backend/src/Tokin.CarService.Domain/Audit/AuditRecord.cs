using Tokin.CarService.Domain.ReferenceData;

namespace Tokin.CarService.Domain.Audit;

public sealed class AuditRecord
{
    public Guid Id { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string RecordId { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;
    public Guid? ActorAccountId { get; set; }
    public UserAccount? ActorAccount { get; set; }
    public string? OldDataJson { get; set; }
    public string? NewDataJson { get; set; }
    public string? ChangedFieldsJson { get; set; }
    public string? IpAddress { get; set; }
    public Guid CorrelationId { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}
