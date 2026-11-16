using System.Data;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Domain.Requests;
using Tokin.CarService.Domain.Security;
using Tokin.CarService.Domain.Workflow;
using Tokin.CarService.Infrastructure.Persistence;

namespace Tokin.CarService.Infrastructure.PublicRequests;

internal sealed class PublicApprovalService(
    IDbContextFactory<CarServiceDbContext> dbContextFactory,
    TimeProvider timeProvider) : IPublicApprovalService
{
    private static readonly string[] DecisionRecipients = ["requester", "ga"];

    public async Task<PublicApprovalAccess?> ReadAsync(string? token, CancellationToken cancellationToken)
    {
        var hash = TokenHash(token);
        if (hash is null) return null;
        var now = timeProvider.GetUtcNow();
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var access = await db.RequestAccessTokens.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TokenHash == hash
                && x.TokenType == AccessTokenType.Approval
                && x.UsedAtUtc == null && x.RevokedAtUtc == null
                && x.ExpiresAtUtc > now, cancellationToken);
        if (access is null) return null;
        var request = await db.TransportRequests.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == access.TransportRequestId
                && x.Status == TransportRequestStatus.PendingApproval
                && x.RevisionNumber == access.RevisionNumber, cancellationToken);
        if (request is null || !await IsAssignedActiveApproverAsync(db, request, access, cancellationToken))
            return null;

        return new PublicApprovalAccess(
            request.BookingNumber,
            request.RequesterName,
            request.RequesterDepartmentName,
            request.ApproverName ?? string.Empty,
            request.UsingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            request.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            request.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            request.PickupLocation,
            request.Destination,
            request.Purpose,
            request.PassengerCount,
            request.IsUrgent);
    }

    public async Task<PublicApprovalActionResult?> DecideAsync(
        PublicApprovalActionCommand command,
        CancellationToken cancellationToken)
    {
        var hash = TokenHash(command.Token);
        if (hash is null) return null;
        var (action, status) = ParseAction(command.Action);
        var comments = command.Comments?.Trim() ?? string.Empty;
        if (comments.Length > 1000 || (action != ApprovalAction.Approved && comments.Length == 0))
        {
            throw ValidationError("comments", "Add a reason of up to 1,000 characters for this decision.");
        }

        var now = timeProvider.GetUtcNow();
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable, cancellationToken);
            var claimed = await db.RequestAccessTokens
                .Where(x => x.TokenHash == hash
                    && x.TokenType == AccessTokenType.Approval
                    && x.UsedAtUtc == null && x.RevokedAtUtc == null
                    && x.ExpiresAtUtc > now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.UsedAtUtc, now), cancellationToken);
            if (claimed != 1) return null;

            var access = await db.RequestAccessTokens.AsNoTracking()
                .SingleAsync(x => x.TokenHash == hash, cancellationToken);
            var request = await db.TransportRequests.SingleOrDefaultAsync(
                x => x.Id == access.TransportRequestId
                    && x.Status == TransportRequestStatus.PendingApproval
                    && x.RevisionNumber == access.RevisionNumber,
                cancellationToken);
            if (request is null || !await IsAssignedActiveApproverAsync(db, request, access, cancellationToken))
                return null;

            request.Status = status;
            request.DecisionReason = comments.Length == 0 ? null : comments;
            request.WorkflowVersion++;
            request.RevisionNumber++;
            request.UpdatedAtUtc = now;
            var correlationId = Guid.CreateVersion7();
            db.ApprovalRecords.Add(new ApprovalRecord
            {
                Id = Guid.CreateVersion7(),
                TransportRequestId = request.Id,
                ApproverAccountId = request.ApproverAccountId,
                ApproverName = request.ApproverName ?? string.Empty,
                ApproverEmail = request.ApproverEmail ?? string.Empty,
                Action = action,
                Comments = comments,
                Source = "email_link",
                CorrelationId = correlationId,
                ActedAtUtc = now,
            });
            db.RequestRevisions.Add(new RequestRevision
            {
                Id = Guid.CreateVersion7(),
                TransportRequestId = request.Id,
                RevisionNumber = request.RevisionNumber,
                Status = status,
                SnapshotJson = JsonSerializer.Serialize(new
                {
                    request.BookingNumber,
                    Status = status.ToString(),
                    request.WorkflowVersion,
                }),
                ChangeSource = "approver_decision",
                ChangedByEmail = access.SubjectEmail,
                ChangeReason = comments.Length == 0 ? null : comments,
                CreatedAtUtc = now,
            });
            foreach (var recipient in DecisionRecipients)
            {
                db.WorkflowOutbox.Add(new WorkflowOutboxMessage
                {
                    Id = Guid.CreateVersion7(),
                    TransportRequestId = request.Id,
                    EventType = $"request.approval.decided.{recipient}",
                    DeduplicationKey = $"approval-decision:{request.Id:N}:{request.WorkflowVersion}:{recipient}",
                    PayloadJson = JsonSerializer.Serialize(new
                    {
                        requestId = request.Id,
                        status = status.ToString(),
                    }),
                    Status = OutboxStatus.Pending,
                    MaxAttempts = 8,
                    AvailableAtUtc = now,
                    CorrelationId = correlationId,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now,
                });
            }

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new PublicApprovalActionResult(request.BookingNumber, status.ToString());
        });
    }

    private static async Task<bool> IsAssignedActiveApproverAsync(
        CarServiceDbContext db,
        TransportRequest request,
        RequestAccessToken access,
        CancellationToken cancellationToken) =>
        request.ApproverAccountId.HasValue
        && string.Equals(access.SubjectEmail, request.ApproverEmail, StringComparison.OrdinalIgnoreCase)
        && await db.DepartmentApprovers.AsNoTracking().AnyAsync(x =>
            x.DepartmentId == request.DepartmentId
            && x.UserAccountId == request.ApproverAccountId.Value
            && x.IsActive && x.UserAccount.IsActive
            && x.UserAccount.Role == UserRole.Approver
            && x.UserAccount.Email == access.SubjectEmail,
            cancellationToken);

    private static string? TokenHash(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)
            || token.Length is < 32 or > 128
            || token.Any(character => !char.IsAsciiLetterOrDigit(character) && character is not '-' and not '_'))
            return null;
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }

    private static (ApprovalAction Action, TransportRequestStatus Status) ParseAction(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "approve" => (ApprovalAction.Approved, TransportRequestStatus.Approved),
            "reject" => (ApprovalAction.Rejected, TransportRequestStatus.Rejected),
            "request_changes" => (ApprovalAction.ChangesRequested, TransportRequestStatus.ChangesRequested),
            _ => throw ValidationError("action", "Choose Approve, Deny, or Request changes."),
        };

    private static PublicRequestValidationException ValidationError(string field, string message) =>
        new(new Dictionary<string, string[]>(StringComparer.Ordinal) { [field] = [message] });
}
