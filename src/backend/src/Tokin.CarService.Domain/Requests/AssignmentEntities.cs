using Tokin.CarService.Domain.Common;
using Tokin.CarService.Domain.ReferenceData;

namespace Tokin.CarService.Domain.Requests;

public sealed class TransportAssignment : AuditableEntity
{
    public Guid TransportRequestId { get; set; }
    public TransportRequest TransportRequest { get; set; } = null!;
    public Guid AssignedByAccountId { get; set; }
    public UserAccount AssignedByAccount { get; set; } = null!;
    public string? Notes { get; set; }
    public DateTimeOffset AssignedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public ICollection<TransportUnit> Units { get; } = new List<TransportUnit>();
}

public sealed class TransportUnit : AuditableEntity
{
    public Guid TransportAssignmentId { get; set; }
    public TransportAssignment TransportAssignment { get; set; } = null!;
    public string UnitCode { get; set; } = string.Empty;
    public string LicensePlate { get; set; } = string.Empty;
    public string VehicleDescription { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty;
    public string DriverName { get; set; } = string.Empty;
    public string DriverPhone { get; set; } = string.Empty;
    public string? ContractorName { get; set; }
    public decimal? TripRateThb { get; set; }
    public bool DriverAccepted { get; set; }
    public DateTimeOffset? DriverAcceptedAtUtc { get; set; }
    public ICollection<TransportUnitRider> Riders { get; } = new List<TransportUnitRider>();
}

public sealed class TransportUnitRider
{
    public Guid TransportUnitId { get; set; }
    public TransportUnit TransportUnit { get; set; } = null!;
    public Guid OvertimeRiderId { get; set; }
    public OvertimeRider OvertimeRider { get; set; } = null!;
}

public sealed class DriverDispatchEvent
{
    public Guid Id { get; set; }
    public Guid TransportRequestId { get; set; }
    public TransportRequest TransportRequest { get; set; } = null!;
    public Guid? TransportUnitId { get; set; }
    public TransportUnit? TransportUnit { get; set; }
    public DriverDispatchAction Action { get; set; }
    public string Channel { get; set; } = "line_manual";
    public Guid? ActorAccountId { get; set; }
    public UserAccount? ActorAccount { get; set; }
    public string? ActorEmail { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}
