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

public sealed record GaOtRequestItem(Guid Id, string RequestNo, string RequesterName,
    string UsingDate, string StartTime, string VerificationStatus, int RevisionNumber);
public sealed record GaOtRequestPage(IReadOnlyList<GaOtRequestItem> Items, int Page, int PageSize, int Total);
public sealed record GaOtRider(string EmployeeId, string EmployeeName, string? EmployeeEmail,
    string WorkDescription, string WorkStart, string WorkEnd, string? BusStop);
public sealed record GaOtRequestDetail(Guid Id, string RequestNo, string RequesterName,
    string UsingDate, string StartTime, string EndTime, string PickupLocation, string Destination,
    string Status, string VerificationStatus, string? VerificationNote, int RevisionNumber,
    IReadOnlyList<GaOtRider> Riders);
public sealed record GaOtVerifyCommand(int ExpectedRevision, string? Result, string? Note);

public sealed class GaAssignmentConflictException(string message) : Exception(message);

public interface IGaAssignmentService
{
    Task<GaRequestPage> ListAsync(Guid actorId, int page, CancellationToken cancellationToken);
    Task<GaRequestDetail?> DetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken);
    Task<GaRequestDetail?> AssignAsync(Guid actorId, Guid requestId, GaAssignCommand command, CancellationToken cancellationToken);
    Task<GaRequestDetail?> RecordDispatchAsync(Guid actorId, Guid requestId, GaDispatchCommand command, CancellationToken cancellationToken);
    Task<GaOtRequestPage> ListOtAsync(Guid actorId, int page, CancellationToken cancellationToken);
    Task<GaOtRequestDetail?> OtDetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken);
    Task<GaOtRequestDetail?> VerifyOtAsync(Guid actorId, Guid requestId, GaOtVerifyCommand command, CancellationToken cancellationToken);
}
