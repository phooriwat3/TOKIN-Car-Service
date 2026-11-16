namespace Tokin.CarService.Application.PublicRequests;

public sealed record PublicRequestChangeAccess(
    string RequestNo,
    string RequesterName,
    string ApproverName,
    string Reason,
    string UsingDate,
    string StartTime,
    string EndTime,
    string PickupLocation,
    string Destination,
    string Purpose,
    string MeetingPoint,
    bool WithStaff,
    string? ImmediateReason,
    IReadOnlyList<string> Passengers);

public sealed record PublicRequestChangeCommand(
    string? Token,
    string? UsingDate,
    string? StartTime,
    string? EndTime,
    string? PickupLocation,
    string? Destination,
    string? Purpose,
    string? MeetingPoint,
    bool WithStaff,
    string? ImmediateReason,
    IReadOnlyList<string>? Passengers);

public sealed record PublicRequestChangeResult(string RequestNo, string Status);

public interface IPublicRequestChangeService
{
    Task<PublicRequestChangeAccess?> ReadAsync(string? token, CancellationToken cancellationToken);
    Task<PublicRequestChangeResult?> ResubmitAsync(PublicRequestChangeCommand command, CancellationToken cancellationToken);
}
