namespace Tokin.CarService.Application.Ga;

public sealed record GaOtAssignmentRider(
    Guid Id, string EmployeeId, string EmployeeName, string? EmployeePhone, string? BusStop);

public sealed record GaOtAssignmentUnit(
    Guid Id, string UnitCode, string LicensePlate, string VehicleType,
    string DriverName, string DriverPhone, IReadOnlyList<Guid> RiderIds,
    string LineMessage, bool LineSent);

public sealed record GaOtAssignmentDetail(
    Guid Id, string RequestNo, string Status, int RevisionNumber,
    string RequesterName, string UsingDate, string StartTime, string EndTime,
    string PickupLocation, string Destination, string? Notes,
    IReadOnlyList<GaOtAssignmentRider> Riders, IReadOnlyList<GaOtAssignmentUnit> Units);

public sealed record GaOtAssignUnitCommand(
    string? LicensePlate, string? VehicleType, string? DriverName,
    string? DriverPhone, IReadOnlyList<Guid>? RiderIds);

public sealed record GaOtAssignCommand(
    int ExpectedRevision, IReadOnlyList<GaOtAssignUnitCommand>? Units, string? Notes);

public interface IGaOtAssignmentService
{
    Task<GaRequestPage> ListAsync(Guid actorId, int page, CancellationToken cancellationToken);
    Task<GaOtAssignmentDetail?> DetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken);
    Task<GaOtAssignmentDetail?> AssignAsync(Guid actorId, Guid requestId, GaOtAssignCommand command,
        CancellationToken cancellationToken);
    Task<GaOtAssignmentDetail?> RecordDispatchAsync(Guid actorId, Guid requestId, Guid unitId,
        GaDispatchCommand command, CancellationToken cancellationToken);
}
