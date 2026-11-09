using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Domain.Requests;
using Tokin.CarService.Domain.Security;
using Tokin.CarService.Domain.Workflow;
using Tokin.CarService.Infrastructure.Persistence;

namespace Tokin.CarService.Infrastructure.PublicRequests;

internal sealed class PublicRequestConfirmationService(
    IDbContextFactory<CarServiceDbContext> dbContextFactory,
    TimeProvider timeProvider) : IPublicRequestConfirmationService
{
    public async Task<ConfirmPublicRequestResult?> ConfirmAsync(
        string? token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token)
            || token.Length is < 32 or > 128
            || token.Any(character => !char.IsAsciiLetterOrDigit(character) && character is not '-' and not '_'))
        {
            return null;
        }

        var tokenHash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        var utcNow = timeProvider.GetUtcNow();
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var claimed = await db.RequestAccessTokens
                .Where(x => x.TokenHash == tokenHash
                    && x.TokenType == AccessTokenType.RequesterConfirmation
                    && x.UsedAtUtc == null
                    && x.RevokedAtUtc == null
                    && x.ExpiresAtUtc > utcNow)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.UsedAtUtc, utcNow), cancellationToken);
            if (claimed != 1)
            {
                return null;
            }

            var accessToken = await db.RequestAccessTokens.AsNoTracking()
                .SingleAsync(x => x.TokenHash == tokenHash, cancellationToken);

            var request = await db.TransportRequests.SingleOrDefaultAsync(
                x => x.Id == accessToken.TransportRequestId
                    && x.Status == TransportRequestStatus.PendingRequesterConfirmation
                    && x.RevisionNumber == accessToken.RevisionNumber,
                cancellationToken);
            if (request is null)
            {
                return null;
            }
            if (!string.Equals(accessToken.SubjectEmail, request.RequesterEmail, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            request.RequesterConfirmedAtUtc = utcNow;
            request.Status = request.RequestType == TransportRequestType.Overtime
                ? TransportRequestStatus.PendingOtVerification
                : TransportRequestStatus.PendingApproval;
            request.WorkflowVersion++;
            request.UpdatedAtUtc = utcNow;
            db.RequestRevisions.Add(new RequestRevision
            {
                Id = Guid.CreateVersion7(),
                TransportRequestId = request.Id,
                RevisionNumber = request.RevisionNumber + 1,
                Status = request.Status,
                SnapshotJson = JsonSerializer.Serialize(new
                {
                    request.BookingNumber,
                    request.Status,
                    request.WorkflowVersion,
                }),
                ChangeSource = "requester_confirmation",
                ChangedByEmail = request.RequesterEmail,
                CreatedAtUtc = utcNow,
            });
            request.RevisionNumber++;
            db.WorkflowOutbox.Add(new WorkflowOutboxMessage
            {
                Id = Guid.CreateVersion7(),
                TransportRequestId = request.Id,
                EventType = request.RequestType == TransportRequestType.Overtime
                    ? "request.ot_verification.requested"
                    : "request.approval.requested",
                DeduplicationKey = $"post-confirmation:{request.Id:N}:{request.WorkflowVersion}",
                PayloadJson = JsonSerializer.Serialize(new { requestId = request.Id }),
                Status = OutboxStatus.Pending,
                MaxAttempts = 8,
                AvailableAtUtc = utcNow,
                CorrelationId = Guid.CreateVersion7(),
                CreatedAtUtc = utcNow,
                UpdatedAtUtc = utcNow,
            });

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new ConfirmPublicRequestResult(
                request.BookingNumber,
                request.Status.ToString());
        });
    }
}
