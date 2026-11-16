using System.Data;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Domain.Requests;
using Tokin.CarService.Domain.Security;
using Tokin.CarService.Domain.Workflow;
using Tokin.CarService.Infrastructure.Persistence;

namespace Tokin.CarService.Infrastructure.PublicRequests;

internal sealed class PublicRequestChangeService(
    IDbContextFactory<CarServiceDbContext> dbContextFactory,
    ISecureActionTokenService tokenService,
    IOptions<PublicRequestOptions> options,
    TimeProvider timeProvider) : IPublicRequestChangeService
{
    private readonly PublicRequestOptions _options = options.Value;
    private static readonly TimeZoneInfo BangkokTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");

    public async Task<PublicRequestChangeAccess?> ReadAsync(string? token, CancellationToken cancellationToken)
    {
        var hash = TokenHash(token);
        if (hash is null) return null;
        var now = timeProvider.GetUtcNow();
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var access = await db.RequestAccessTokens.AsNoTracking().SingleOrDefaultAsync(x =>
            x.TokenHash == hash && x.TokenType == AccessTokenType.RequesterManage
            && x.UsedAtUtc == null && x.RevokedAtUtc == null && x.ExpiresAtUtc > now,
            cancellationToken);
        if (access is null) return null;
        var request = await db.TransportRequests.AsNoTracking().Include(x => x.Passengers)
            .SingleOrDefaultAsync(x => x.Id == access.TransportRequestId
                && x.Status == TransportRequestStatus.ChangesRequested
                && x.RevisionNumber == access.RevisionNumber
                && x.RequestType == TransportRequestType.OutsideCompany, cancellationToken);
        if (request is null || !string.Equals(request.RequesterEmail, access.SubjectEmail, StringComparison.OrdinalIgnoreCase))
            return null;
        return new PublicRequestChangeAccess(
            request.BookingNumber, request.RequesterName, request.ApproverName ?? string.Empty,
            request.DecisionReason ?? string.Empty,
            request.UsingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            request.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            request.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            request.PickupLocation, request.Destination, request.Purpose,
            request.MeetingPoint == MeetingPoint.LoadingArea ? "loading_area" : "front_area",
            request.WithStaff, request.UrgentReason,
            request.Passengers.OrderBy(x => x.Sequence).Select(x => x.Name).ToArray());
    }

    public async Task<PublicRequestChangeResult?> ResubmitAsync(
        PublicRequestChangeCommand command, CancellationToken cancellationToken)
    {
        var hash = TokenHash(command.Token);
        if (hash is null) return null;
        var now = timeProvider.GetUtcNow();
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
            var access = await db.RequestAccessTokens.AsNoTracking().SingleOrDefaultAsync(x =>
                x.TokenHash == hash && x.TokenType == AccessTokenType.RequesterManage
                && x.UsedAtUtc == null && x.RevokedAtUtc == null && x.ExpiresAtUtc > now,
                cancellationToken);
            if (access is null) return null;
            var request = await db.TransportRequests.Include(x => x.Department)
                .SingleOrDefaultAsync(x => x.Id == access.TransportRequestId
                    && x.Status == TransportRequestStatus.ChangesRequested
                    && x.RevisionNumber == access.RevisionNumber
                    && x.RequestType == TransportRequestType.OutsideCompany, cancellationToken);
            if (request is null || !string.Equals(request.RequesterEmail, access.SubjectEmail, StringComparison.OrdinalIgnoreCase))
                return null;
            if (!request.ApproverAccountId.HasValue || !await db.DepartmentApprovers.AsNoTracking().AnyAsync(x =>
                x.DepartmentId == request.DepartmentId && x.UserAccountId == request.ApproverAccountId.Value
                && x.IsActive && x.UserAccount.IsActive && x.UserAccount.Role == UserRole.Approver
                && x.UserAccount.Email == request.ApproverEmail, cancellationToken))
                throw new PublicRequestValidationException(new Dictionary<string, string[]>(StringComparer.Ordinal)
                {
                    ["approver"] = ["The assigned approver is unavailable. Contact GA."],
                });

            var input = new SubmitPublicRequestCommand(
                "outside_company",
                new PublicRequesterInput(request.RequesterName, request.RequesterEmail,
                    request.RequesterEmployeeId, request.Department.Code, request.RequesterPhone),
                new PublicApproverInput(request.ApproverName, request.ApproverEmail),
                command.UsingDate, command.StartTime, command.EndTime,
                command.PickupLocation, command.Destination, command.Purpose,
                command.MeetingPoint, command.WithStaff, command.ImmediateReason,
                command.Passengers, null, false, null);
            var validated = PublicRequestValidator.Validate(input, _options,
                TimeZoneInfo.ConvertTime(now, BangkokTimeZone));

            var claimed = await db.RequestAccessTokens.Where(x => x.Id == access.Id
                    && x.UsedAtUtc == null && x.RevokedAtUtc == null && x.ExpiresAtUtc > now)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.UsedAtUtc, now), cancellationToken);
            if (claimed != 1) return null;

            request.UsingDate = validated.UsingDate;
            request.StartTime = validated.StartTime;
            request.EndTime = validated.EndTime;
            request.PickupLocation = validated.PickupLocation;
            request.Destination = validated.Destination;
            request.Purpose = validated.Purpose;
            request.MeetingPoint = validated.MeetingPoint;
            request.WithStaff = validated.WithStaff;
            request.PassengerCount = Math.Max(1, validated.Passengers.Count);
            request.IsUrgent = validated.IsImmediate;
            request.UrgentReason = validated.UrgentReason;
            request.DecisionReason = null;
            request.Status = TransportRequestStatus.PendingApproval;
            request.RevisionNumber++;
            request.WorkflowVersion++;
            request.LastSubmittedAtUtc = now;
            request.UpdatedAtUtc = now;
            await db.RequestPassengers.Where(x => x.TransportRequestId == request.Id)
                .ExecuteDeleteAsync(cancellationToken);
            for (var index = 0; index < validated.Passengers.Count; index++)
                db.RequestPassengers.Add(new RequestPassenger
                {
                    Id = Guid.CreateVersion7(),
                    TransportRequestId = request.Id,
                    Name = validated.Passengers[index],
                    Sequence = index,
                });
            db.RequestRevisions.Add(new RequestRevision
            {
                Id = Guid.CreateVersion7(), TransportRequestId = request.Id,
                RevisionNumber = request.RevisionNumber, Status = request.Status,
                SnapshotJson = JsonSerializer.Serialize(validated),
                ChangeSource = "requester_resubmission", ChangedByEmail = request.RequesterEmail,
                CreatedAtUtc = now,
            });
            var approvalToken = tokenService.Issue("approver-decision:v1");
            var approvalTokenId = Guid.CreateVersion7();
            db.RequestAccessTokens.Add(new RequestAccessToken
            {
                Id = approvalTokenId, TransportRequestId = request.Id,
                TokenType = AccessTokenType.Approval, TokenHash = approvalToken.TokenHash,
                RevisionNumber = request.RevisionNumber, SubjectEmail = request.ApproverEmail!,
                ExpiresAtUtc = now.AddHours(72), CreatedAtUtc = now,
            });
            db.WorkflowOutbox.Add(new WorkflowOutboxMessage
            {
                Id = Guid.CreateVersion7(), TransportRequestId = request.Id,
                EventType = "request.approval.requested",
                DeduplicationKey = $"post-resubmission:{request.Id:N}:{request.WorkflowVersion}",
                PayloadJson = JsonSerializer.Serialize(new
                {
                    requestId = request.Id, approvalTokenId,
                    protectedToken = approvalToken.ProtectedToken,
                }),
                Status = OutboxStatus.Pending, MaxAttempts = 8, AvailableAtUtc = now,
                CorrelationId = Guid.CreateVersion7(), CreatedAtUtc = now, UpdatedAtUtc = now,
            });
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new PublicRequestChangeResult(request.BookingNumber, request.Status.ToString());
        });
    }

    private static string? TokenHash(string? token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length is < 32 or > 128
            || token.Any(character => !char.IsAsciiLetterOrDigit(character) && character is not '-' and not '_'))
            return null;
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }
}
