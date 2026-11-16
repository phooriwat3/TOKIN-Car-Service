namespace Tokin.CarService.Application.PublicRequests;

public sealed record PublicApprovalAccess(
    string RequestNo,
    string RequesterName,
    string Department,
    string ApproverName,
    string UsingDate,
    string StartTime,
    string EndTime,
    string PickupLocation,
    string Destination,
    string Purpose,
    int PassengerCount,
    bool IsUrgent);

public sealed record PublicApprovalActionCommand(string? Token, string? Action, string? Comments);

public sealed record PublicApprovalActionResult(string RequestNo, string Status);

public interface IPublicApprovalService
{
    Task<PublicApprovalAccess?> ReadAsync(string? token, CancellationToken cancellationToken);
    Task<PublicApprovalActionResult?> DecideAsync(
        PublicApprovalActionCommand command,
        CancellationToken cancellationToken);
}
