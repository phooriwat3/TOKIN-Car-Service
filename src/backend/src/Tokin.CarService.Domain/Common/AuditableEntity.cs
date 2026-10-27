namespace Tokin.CarService.Domain.Common;

public abstract class AuditableEntity
{
    public Guid Id { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset UpdatedAtUtc { get; set; }
}
