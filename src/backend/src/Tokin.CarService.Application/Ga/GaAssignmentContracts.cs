namespace Tokin.CarService.Application.Ga;

public sealed record GaRequestListItem(
    Guid Id, string RequestNo, string Status, string RequesterName,
    string UsingDate, string StartTime, string PickupLocation, string Destination);

public sealed record GaRequestPage(IReadOnlyList<GaRequestListItem> Items, int Page, int PageSize, int Total);

public sealed record GaRequestDetail(
    Guid Id, string RequestNo, string Status, int RevisionNumber,
    string RequesterName, string? RequesterPhone, string UsingDate,
    string StartTime, string EndTime, string PickupLocation, string Destination,
    string Purpose, int PassengerCount, string? LicensePlate, string? VehicleType,
    string? DriverName, string? DriverPhone, string? Notes,
    string? LineMessage, bool LineSent);

public sealed record GaAssignCommand(
    int ExpectedRevision, string? LicensePlate, string? VehicleType,
    string? DriverName, string? DriverPhone, string? Notes);

public sealed record GaDispatchCommand(string? Action);

public sealed class GaAssignmentConflictException(string message) : Exception(message);

public interface IGaAssignmentService
{
    Task<GaRequestPage> ListAsync(Guid actorId, int page, CancellationToken cancellationToken);
    Task<GaRequestDetail?> DetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken);
    Task<GaRequestDetail?> AssignAsync(Guid actorId, Guid requestId, GaAssignCommand command, CancellationToken cancellationToken);
    Task<GaRequestDetail?> RecordDispatchAsync(Guid actorId, Guid requestId, GaDispatchCommand command, CancellationToken cancellationToken);
}
