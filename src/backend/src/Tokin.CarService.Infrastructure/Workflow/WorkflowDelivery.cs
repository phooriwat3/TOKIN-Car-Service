using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Tokin.CarService.Domain.Requests;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Domain.Security;
using Tokin.CarService.Domain.Workflow;
using Tokin.CarService.Infrastructure.Persistence;

namespace Tokin.CarService.Infrastructure.Workflow;

public sealed record WorkflowNotification(
    string DeduplicationKey,
    string RecipientEmail,
    string EmailSubject,
    string EmailBodyHtml);

public sealed record WorkflowDeliveryResult(bool Delivered, int? HttpStatus, string? Error);

public interface IWorkflowNotificationSender
{
    Task<WorkflowDeliveryResult> SendAsync(WorkflowNotification notification, CancellationToken cancellationToken);
}

internal sealed class WebhookNotificationSender(HttpClient client, IConfiguration configuration)
    : IWorkflowNotificationSender
{
    public async Task<WorkflowDeliveryResult> SendAsync(
        WorkflowNotification notification,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            configuration["WorkflowDelivery:EndpointUrl"]);
        request.Headers.TryAddWithoutValidation(
            "x-workflow-secret", configuration["WorkflowDelivery:SharedSecret"]);
        request.Headers.TryAddWithoutValidation("Idempotency-Key", notification.DeduplicationKey);
        request.Content = JsonContent.Create(notification);
        try
        {
            using var response = await client.SendAsync(request, cancellationToken);
            return response.IsSuccessStatusCode
                ? new WorkflowDeliveryResult(true, (int)response.StatusCode, null)
                : new WorkflowDeliveryResult(false, (int)response.StatusCode, "Notification provider rejected the request.");
        }
        catch (HttpRequestException)
        {
            return new WorkflowDeliveryResult(false, null, "Notification provider connection failed.");
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new WorkflowDeliveryResult(false, null, "Notification provider timed out.");
        }
    }
}

public interface IWorkflowOutboxProcessor
{
    Task<bool> ProcessOneAsync(CancellationToken cancellationToken);
}

internal sealed class WorkflowOutboxProcessor(
    IDbContextFactory<CarServiceDbContext> dbContextFactory,
    IDataProtectionProvider dataProtectionProvider,
    IWorkflowNotificationSender sender,
    IConfiguration configuration,
    TimeProvider timeProvider) : IWorkflowOutboxProcessor
{
    private readonly IDataProtector _tokenProtector = dataProtectionProvider.CreateProtector(
        "Tokin.CarService", "PublicRequestActionToken", "requester-confirmation:v1");
    private readonly IDataProtector _approvalProtector = dataProtectionProvider.CreateProtector(
        "Tokin.CarService", "PublicRequestActionToken", "approver-decision:v1");
    private readonly IDataProtector _manageProtector = dataProtectionProvider.CreateProtector(
        "Tokin.CarService", "PublicRequestActionToken", "requester-manage:v1");

    public async Task<bool> ProcessOneAsync(CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();
        var staleBefore = now.AddMinutes(-2);
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        await db.WorkflowOutbox
            .Where(x => x.Status == OutboxStatus.Processing
                && x.LockedAtUtc <= staleBefore
                && x.AttemptCount >= x.MaxAttempts)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, OutboxStatus.DeadLetter)
                .SetProperty(x => x.LastError, "Delivery lease expired after the final attempt.")
                .SetProperty(x => x.LockedAtUtc, (DateTimeOffset?)null)
                .SetProperty(x => x.LockedBy, (Guid?)null)
                .SetProperty(x => x.UpdatedAtUtc, now), cancellationToken);
        var candidate = await db.WorkflowOutbox.AsNoTracking()
            .Where(x =>
                (x.EventType == "request.confirmation.requested"
                    || x.EventType == "request.approval.requested"
                    || x.EventType == "request.approval.decided.requester"
                    || x.EventType == "request.approval.decided.ga"
                    || x.EventType == "request.assignment.requester"
                    || x.EventType == "request.ot_verification.requested"
                    || x.EventType == "request.ot_verification.decided.requester"
                    || x.EventType == "request.ot_assignment.requester")
                && x.AttemptCount < x.MaxAttempts
                && ((x.Status == OutboxStatus.Pending || x.Status == OutboxStatus.Failed)
                    && x.AvailableAtUtc <= now
                    || x.Status == OutboxStatus.Processing && x.LockedAtUtc <= staleBefore))
            .OrderBy(x => x.AvailableAtUtc)
            .ThenBy(x => x.CreatedAtUtc)
            .Select(x => new { x.Id })
            .FirstOrDefaultAsync(cancellationToken);
        if (candidate is null) return false;

        var lockId = Guid.CreateVersion7();
        var claimed = await db.WorkflowOutbox
            .Where(x => x.Id == candidate.Id && x.AttemptCount < x.MaxAttempts
                && ((x.Status == OutboxStatus.Pending || x.Status == OutboxStatus.Failed)
                    && x.AvailableAtUtc <= now
                    || x.Status == OutboxStatus.Processing && x.LockedAtUtc <= staleBefore))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, OutboxStatus.Processing)
                .SetProperty(x => x.LockedAtUtc, now)
                .SetProperty(x => x.LockedBy, lockId)
                .SetProperty(x => x.AttemptCount, x => x.AttemptCount + 1)
                .SetProperty(x => x.UpdatedAtUtc, now), cancellationToken);
        if (claimed == 0) return true;

        var message = await db.WorkflowOutbox.AsNoTracking()
            .SingleAsync(x => x.Id == candidate.Id, cancellationToken);
        WorkflowDeliveryResult delivery;
        try
        {
            var notification = await CreateNotificationAsync(db, message, now, cancellationToken);
            delivery = notification is null
                ? new WorkflowDeliveryResult(false, null, "Notification is no longer valid.")
                : await sender.SendAsync(notification, cancellationToken);
        }
        catch (Exception exception) when (exception is JsonException
            or System.Security.Cryptography.CryptographicException
            or KeyNotFoundException
            or FormatException
            or ArgumentException)
        {
            delivery = new WorkflowDeliveryResult(false, null, "Notification payload is invalid.");
        }

        var completedAt = timeProvider.GetUtcNow();
        var safeError = delivery.Error switch
        {
            null => null,
            "Notification is no longer valid." or "Notification payload is invalid."
                or "Notification provider rejected the request."
                or "Notification provider connection failed."
                or "Notification provider timed out." => delivery.Error,
            _ => "Notification delivery failed.",
        };
        var permanent = safeError is "Notification is no longer valid." or "Notification payload is invalid.";
        var nextRetry = completedAt.AddMinutes(Math.Min(60, 1 << Math.Min(message.AttemptCount, 6)));
        var nextStatus = delivery.Delivered ? OutboxStatus.Delivered
            : permanent || message.AttemptCount >= message.MaxAttempts ? OutboxStatus.DeadLetter
            : OutboxStatus.Failed;
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var completionDb = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var completion = await completionDb.Database.BeginTransactionAsync(cancellationToken);
            var updated = await completionDb.WorkflowOutbox
            .Where(x => x.Id == message.Id && x.Status == OutboxStatus.Processing && x.LockedBy == lockId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, nextStatus)
                .SetProperty(x => x.AvailableAtUtc, delivery.Delivered ? completedAt : nextRetry)
                .SetProperty(x => x.DeliveredAtUtc, delivery.Delivered ? completedAt : (DateTimeOffset?)null)
                .SetProperty(x => x.LastError, safeError)
                .SetProperty(x => x.LockedAtUtc, (DateTimeOffset?)null)
                .SetProperty(x => x.LockedBy, (Guid?)null)
                .SetProperty(x => x.UpdatedAtUtc, completedAt), cancellationToken);
            if (updated == 1)
            {
                completionDb.WorkflowDeliveries.Add(new WorkflowDelivery
                {
                    Id = Guid.CreateVersion7(),
                    OutboxMessageId = message.Id,
                    AttemptNumber = message.AttemptCount,
                    Channel = "email_webhook",
                    Status = delivery.Delivered ? DeliveryStatus.Delivered : DeliveryStatus.Failed,
                    HttpStatus = delivery.HttpStatus,
                    SanitizedError = safeError,
                    StartedAtUtc = now,
                    CompletedAtUtc = completedAt,
                    NextRetryAtUtc = nextStatus == OutboxStatus.Failed ? nextRetry : null,
                });
                await completionDb.SaveChangesAsync(cancellationToken);
            }
            await completion.CommitAsync(cancellationToken);
        });
        return true;
    }

    private async Task<WorkflowNotification?> CreateNotificationAsync(
        CarServiceDbContext db,
        WorkflowOutboxMessage message,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        using var payload = JsonDocument.Parse(message.PayloadJson);
        var root = payload.RootElement;
        var requestId = root.GetProperty("requestId").GetGuid();
        var request = await db.TransportRequests.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == requestId, cancellationToken);
        if (request is null) return null;
        var bookingNumber = System.Net.WebUtility.HtmlEncode(request.BookingNumber);

        if (message.EventType == "request.ot_verification.requested")
        {
            if (request.RequestType != TransportRequestType.Overtime
                || request.Status != TransportRequestStatus.PendingOtVerification
                || request.OtVerificationStatus != OtVerificationStatus.Pending
                || request.OtVerificationMode != OtVerificationMode.TigerSpace) return null;
            var recipient = configuration["WorkflowDelivery:GaNotificationEmail"];
            if (string.IsNullOrWhiteSpace(recipient)) return null;
            var url = new Uri(new Uri(configuration["WorkflowDelivery:AppBaseUrl"]!), "/admin/ot-verification");
            return new WorkflowNotification(message.DeduplicationKey, recipient,
                $"Verify OT transport request {request.BookingNumber}",
                $"<p>OT transport request <strong>{bookingNumber}</strong> is ready for Tiger Space verification.</p>"
                + $"<p><a href=\"{System.Net.WebUtility.HtmlEncode(url.ToString())}\">Open GA verification queue</a></p>");
        }

        if (message.EventType == "request.ot_verification.decided.requester")
        {
            if (request.RequestType != TransportRequestType.Overtime
                || request.RevisionNumber != root.GetProperty("revision").GetInt32()
                || !string.Equals(request.Status.ToString(), root.GetProperty("status").GetString(), StringComparison.Ordinal))
                return null;
            var result = root.GetProperty("result").GetString();
            var messageText = result switch
            {
                "Verified" => "Tiger Space details verified. Your request is approved and awaiting transport arrangement.",
                "NotFound" => "Tiger Space details were not found. Your request is still awaiting verification. Please contact GA.",
                "Rejected" => "Your OT transport request was rejected after verification.",
                _ => throw new JsonException("Unknown OT verification result."),
            };
            var note = string.IsNullOrWhiteSpace(request.OtVerificationNote) ? string.Empty
                : $"<p>GA note: {System.Net.WebUtility.HtmlEncode(request.OtVerificationNote)}</p>";
            return new WorkflowNotification(message.DeduplicationKey, request.RequesterEmail,
                $"OT transport request {request.BookingNumber}: {result}",
                $"<p>Request <strong>{bookingNumber}</strong>: {messageText}</p>" + note);
        }

        if (message.EventType == "request.ot_assignment.requester")
        {
            if (request.RequestType != TransportRequestType.Overtime
                || request.Status != TransportRequestStatus.Assigned
                || request.RevisionNumber != root.GetProperty("revision").GetInt32()) return null;
            var units = await db.TransportUnits.AsNoTracking()
                .Include(x => x.Riders).ThenInclude(x => x.OvertimeRider)
                .Where(x => x.TransportAssignment.TransportRequestId == requestId)
                .ToArrayAsync(cancellationToken);
            if (units.Length == 0) return null;
            static string Encode(string? value) => System.Net.WebUtility.HtmlEncode(value) ?? string.Empty;
            var date = request.UsingDate.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
            var start = request.StartTime.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture);
            var unitHtml = string.Concat(units.OrderBy(unit =>
                int.TryParse(unit.UnitCode, System.Globalization.NumberStyles.None,
                    System.Globalization.CultureInfo.InvariantCulture, out var number) ? number : int.MaxValue)
                .ThenBy(unit => unit.UnitCode, StringComparer.Ordinal).Select(unit =>
                $"<li><strong>Vehicle {Encode(unit.UnitCode)}: {Encode(unit.VehicleType)} "
                + $"({Encode(unit.LicensePlate)})</strong>; driver {Encode(unit.DriverName)} "
                + $"({Encode(unit.DriverPhone)}). Riders: "
                + string.Join(", ", unit.Riders.OrderBy(x => x.OvertimeRider.Sequence).Select(x =>
                    $"{Encode(x.OvertimeRider.EmployeeName)} ({Encode(x.OvertimeRider.BusStop)})"))
                + "</li>"));
            return new WorkflowNotification(message.DeduplicationKey, request.RequesterEmail,
                $"Vehicles assigned for OT request {request.BookingNumber}",
                $"<p>Transport is arranged for <strong>{bookingNumber}</strong> on {date} at {start}.</p>"
                + $"<ul>{unitHtml}</ul><p>GA will send each driver their trip details through LINE.</p>");
        }

        if (message.EventType == "request.assignment.requester")
        {
            if (request.Status != TransportRequestStatus.Assigned) return null;
            var unit = await db.TransportUnits.AsNoTracking()
                .Where(x => x.TransportAssignment.TransportRequestId == requestId)
                .SingleOrDefaultAsync(cancellationToken);
            if (unit is null) return null;
            var date = request.UsingDate.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
            var start = request.StartTime.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture);
            return new WorkflowNotification(
                message.DeduplicationKey, request.RequesterEmail,
                $"Vehicle assigned for transport request {request.BookingNumber}",
                $"<p>Vehicle and driver are assigned for <strong>{bookingNumber}</strong>.</p>"
                + $"<p>{date} at {start}. Vehicle: {System.Net.WebUtility.HtmlEncode(unit.VehicleType)} "
                + $"({System.Net.WebUtility.HtmlEncode(unit.LicensePlate)}). "
                + $"Driver: {System.Net.WebUtility.HtmlEncode(unit.DriverName)} "
                + $"({System.Net.WebUtility.HtmlEncode(unit.DriverPhone)}).</p>"
                + "<p>GA will share the trip details with the driver through LINE.</p>");
        }

        if (message.EventType == "request.confirmation.requested")
        {
            var accessTokenId = root.GetProperty("accessTokenId").GetGuid();
            var accessToken = await db.RequestAccessTokens.AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == accessTokenId
                    && x.TransportRequestId == requestId
                    && x.TokenType == AccessTokenType.RequesterConfirmation
                    && x.UsedAtUtc == null && x.RevokedAtUtc == null
                    && x.ExpiresAtUtc > now, cancellationToken);
            if (accessToken is null || request.Status != TransportRequestStatus.PendingRequesterConfirmation)
                return null;

            var token = _tokenProtector.Unprotect(root.GetProperty("protectedToken").GetString()!);
            var url = new Uri(new Uri(configuration["WorkflowDelivery:AppBaseUrl"]!),
                "/request/confirm?token=" + Uri.EscapeDataString(token));
            return new WorkflowNotification(
                message.DeduplicationKey,
                request.RequesterEmail,
                $"Confirm transport request {request.BookingNumber}",
                $"<p>Please confirm your transport request <strong>{bookingNumber}</strong>.</p>"
                    + $"<p><a href=\"{System.Net.WebUtility.HtmlEncode(url.ToString())}\">Confirm request</a></p>"
                    + "<p>If you did not submit this request, ignore this message.</p>");
        }

        if (message.EventType is "request.approval.decided.requester" or "request.approval.decided.ga")
        {
            var expectedStatus = root.GetProperty("status").GetString();
            if (!string.Equals(request.Status.ToString(), expectedStatus, StringComparison.Ordinal))
                return null;
            var decision = await db.ApprovalRecords.AsNoTracking()
                .Where(x => x.TransportRequestId == requestId)
                .OrderByDescending(x => x.ActedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);
            if (decision is null) return null;
            var isGa = message.EventType.EndsWith(".ga", StringComparison.Ordinal);
            var recipient = isGa
                ? configuration["WorkflowDelivery:GaNotificationEmail"]
                : request.RequesterEmail;
            if (string.IsNullOrWhiteSpace(recipient)) return null;
            var reason = string.IsNullOrEmpty(decision.Comments)
                ? string.Empty
                : $"<p>Reason: {System.Net.WebUtility.HtmlEncode(decision.Comments)}</p>";
            var editLink = string.Empty;
            if (!isGa && request.Status == TransportRequestStatus.ChangesRequested
                && root.TryGetProperty("manageTokenId", out var manageTokenIdValue)
                && manageTokenIdValue.ValueKind == JsonValueKind.String
                && root.TryGetProperty("protectedManageToken", out var protectedManageTokenValue)
                && protectedManageTokenValue.ValueKind == JsonValueKind.String)
            {
                var manageTokenId = manageTokenIdValue.GetGuid();
                var manageAccess = await db.RequestAccessTokens.AsNoTracking().SingleOrDefaultAsync(x =>
                    x.Id == manageTokenId && x.TransportRequestId == requestId
                    && x.TokenType == AccessTokenType.RequesterManage
                    && x.UsedAtUtc == null && x.RevokedAtUtc == null && x.ExpiresAtUtc > now
                    && x.RevisionNumber == request.RevisionNumber
                    && x.SubjectEmail == request.RequesterEmail, cancellationToken);
                if (manageAccess is null) return null;
                var manageToken = _manageProtector.Unprotect(protectedManageTokenValue.GetString()!);
                var manageUrl = new Uri(new Uri(configuration["WorkflowDelivery:AppBaseUrl"]!),
                    "/request/manage?token=" + Uri.EscapeDataString(manageToken));
                editLink = $"<p><a href=\"{System.Net.WebUtility.HtmlEncode(manageUrl.ToString())}\">Edit and resubmit request</a> (link expires in seven days).</p>";
            }
            return new WorkflowNotification(
                message.DeduplicationKey,
                recipient,
                $"Transport request {request.BookingNumber}: {request.Status}",
                $"<p>Transport request <strong>{bookingNumber}</strong> is now {System.Net.WebUtility.HtmlEncode(request.Status.ToString())}.</p>"
                    + reason + editLink);
        }

        if (request.Status != TransportRequestStatus.PendingApproval
            || !request.ApproverAccountId.HasValue
            || string.IsNullOrWhiteSpace(request.ApproverEmail)
            || !await db.DepartmentApprovers.AsNoTracking().AnyAsync(x =>
                x.DepartmentId == request.DepartmentId
                && x.UserAccountId == request.ApproverAccountId.Value
                && x.IsActive
                && x.UserAccount.IsActive
                && x.UserAccount.Role == UserRole.Approver
                && x.UserAccount.Email == request.ApproverEmail,
                cancellationToken)) return null;
        if (!root.TryGetProperty("approvalTokenId", out var approvalTokenIdValue)
            || approvalTokenIdValue.ValueKind != JsonValueKind.String
            || !root.TryGetProperty("protectedToken", out var protectedTokenValue)
            || protectedTokenValue.ValueKind != JsonValueKind.String)
            return null;
        var approvalTokenId = approvalTokenIdValue.GetGuid();
        var access = await db.RequestAccessTokens.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == approvalTokenId
                && x.TransportRequestId == requestId
                && x.TokenType == AccessTokenType.Approval
                && x.UsedAtUtc == null && x.RevokedAtUtc == null
                && x.ExpiresAtUtc > now
                && x.RevisionNumber == request.RevisionNumber
                && x.SubjectEmail == request.ApproverEmail,
                cancellationToken);
        if (access is null) return null;
        var approvalToken = _approvalProtector.Unprotect(protectedTokenValue.GetString()!);
        var approvalUrl = new Uri(new Uri(configuration["WorkflowDelivery:AppBaseUrl"]!),
            "/request/approve?token=" + Uri.EscapeDataString(approvalToken));
        return new WorkflowNotification(
            message.DeduplicationKey,
            request.ApproverEmail,
            $"Transport request awaiting review: {request.BookingNumber}",
            $"<p>Transport request <strong>{bookingNumber}</strong> has been confirmed by the requester and is awaiting your review.</p>"
                + $"<p><a href=\"{System.Net.WebUtility.HtmlEncode(approvalUrl.ToString())}\">Review request</a></p>"
                + "<p>Open the link only if you are the assigned approver.</p>");
    }
}

public static class WorkflowDeliveryRegistration
{
    public static IServiceCollection AddWorkflowDelivery(this IServiceCollection services)
    {
        services.AddSingleton(new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })
        {
            Timeout = TimeSpan.FromSeconds(15),
        });
        services.AddSingleton<IWorkflowNotificationSender, WebhookNotificationSender>();
        services.AddScoped<IWorkflowOutboxProcessor, WorkflowOutboxProcessor>();
        return services;
    }
}
