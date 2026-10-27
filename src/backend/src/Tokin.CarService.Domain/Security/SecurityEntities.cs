using Tokin.CarService.Domain.Requests;

namespace Tokin.CarService.Domain.Security;

public enum AccessTokenType
{
    Unknown = 0,
    RequesterConfirmation,
    Approval,
    RequesterManage,
    AssignmentDocument,
}

public sealed class RequestAccessToken
{
    public Guid Id { get; set; }
    public Guid TransportRequestId { get; set; }
    public TransportRequest TransportRequest { get; set; } = null!;
    public AccessTokenType TokenType { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public int RevisionNumber { get; set; }
    public string SubjectEmail { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public DateTimeOffset? UsedAtUtc { get; set; }
    public DateTimeOffset? RevokedAtUtc { get; set; }
    public DateTimeOffset? LastAccessedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class ApiIdempotencyRecord
{
    public string IdempotencyKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public string RequestHash { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string? ResponseJson { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset ExpiresAtUtc { get; set; }
}

public sealed class PublicRequestAttempt
{
    public long Id { get; set; }
    public string FingerprintHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
}
