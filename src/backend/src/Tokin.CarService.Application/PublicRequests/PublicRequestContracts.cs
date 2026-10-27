namespace Tokin.CarService.Application.PublicRequests;

public sealed record PublicRequesterInput(
    string? Name,
    string? Email,
    string? EmployeeId,
    string? Department,
    string? Phone);

public sealed record PublicApproverInput(string? Name, string? Email);

public sealed record PublicOvertimeRiderInput(
    string? EmployeeId,
    string? EmployeeName,
    string? EmployeeEmail,
    string? EmployeePhone,
    string? WorkDescription,
    string? WorkStart,
    string? WorkEnd,
    decimal TotalWeeklyHours,
    bool TransportRequired,
    string? BusStop);

public sealed record SubmitPublicRequestCommand(
    string? RequestType,
    PublicRequesterInput? Requester,
    PublicApproverInput? Approver,
    string? UsingDate,
    string? StartTime,
    string? EndTime,
    string? PickupLocation,
    string? Destination,
    string? Purpose,
    string? MeetingPoint,
    bool WithStaff,
    string? ImmediateReason,
    IReadOnlyList<string>? Passengers,
    IReadOnlyList<PublicOvertimeRiderInput>? OvertimeEmployees,
    bool TigerSpaceConfirmed,
    string? Website);

public sealed record SubmitPublicRequestResult(
    Guid RequestId,
    string RequestNo,
    string Status,
    DateTimeOffset SubmittedAtUtc);

public interface IPublicRequestSubmissionService
{
    Task<SubmitPublicRequestResult> SubmitAsync(
        SubmitPublicRequestCommand command,
        string idempotencyKey,
        string fingerprintHash,
        CancellationToken cancellationToken);
}

public sealed class PublicRequestOptions
{
    public const string SectionName = "PublicRequests";

    public List<string> AllowedEmailDomains { get; init; } = ["yageo.com"];

    public int ConfirmationTokenLifetimeHours { get; init; } = 168;

    public int MaximumValidSubmissionsPerMinute { get; init; } = 20;
}
