using System.Data;
using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Application.Ga;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Domain.Requests;
using Tokin.CarService.Domain.Workflow;
using Tokin.CarService.Infrastructure.Persistence;

namespace Tokin.CarService.Infrastructure.Ga;

internal sealed class GaAssignmentService(
    IDbContextFactory<CarServiceDbContext> dbContextFactory,
    TimeProvider timeProvider) : IGaAssignmentService
{
    public async Task<GaRequestPage> ListAsync(Guid actorId, int page, CancellationToken cancellationToken)
    {
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        await EnsureAdminAsync(db, actorId, cancellationToken);
        const int pageSize = 25;
        var query = db.TransportRequests.AsNoTracking()
            .Where(x => x.RequestType == TransportRequestType.OutsideCompany
                && (x.Status == TransportRequestStatus.Approved || x.Status == TransportRequestStatus.Assigned));
        var total = await query.CountAsync(cancellationToken);
        var requests = await query.OrderBy(x => x.Status == TransportRequestStatus.Approved ? 0 : 1)
            .ThenBy(x => x.UsingDate).ThenBy(x => x.StartTime).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(cancellationToken);
        var items = requests.Select(x => new GaRequestListItem(
            x.Id, x.BookingNumber, x.Status.ToString(), x.RequesterName,
            x.UsingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            x.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            x.PickupLocation, x.Destination)).ToArray();
        return new GaRequestPage(items, page, pageSize, total);
    }

    public async Task<GaRequestDetail?> DetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken)
    {
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        await EnsureAdminAsync(db, actorId, cancellationToken);
        return await DetailCoreAsync(db, requestId, cancellationToken);
    }

    public async Task<GaRequestDetail?> AssignAsync(
        Guid actorId, Guid requestId, GaAssignCommand command, CancellationToken cancellationToken)
    {
        var plate = Required(command.LicensePlate, "licensePlate", 40);
        var type = Required(command.VehicleType, "vehicleType", 80);
        var driver = Required(command.DriverName, "driverName", 160);
        var phone = Required(command.DriverPhone, "driverPhone", 40);
        var notes = command.Notes?.Trim();
        if (notes?.Length > 2000)
            throw ValidationError("notes", "Notes must be at most 2,000 characters.");
        var now = timeProvider.GetUtcNow();
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        var assigned = await strategy.ExecuteAsync(async () =>
        {
            await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
            await EnsureAdminAsync(db, actorId, cancellationToken);
            var request = await db.TransportRequests.SingleOrDefaultAsync(x => x.Id == requestId
                && x.RequestType == TransportRequestType.OutsideCompany, cancellationToken);
            if (request is null) return false;
            if (request.Status != TransportRequestStatus.Approved
                || request.RevisionNumber != command.ExpectedRevision
                || await db.TransportAssignments.AnyAsync(x => x.TransportRequestId == requestId, cancellationToken))
                throw new GaAssignmentConflictException("This request has changed. Reload before assigning.");

            var assignment = new TransportAssignment
            {
                Id = Guid.CreateVersion7(), TransportRequestId = requestId,
                AssignedByAccountId = actorId, Notes = notes,
                AssignedAtUtc = now, CreatedAtUtc = now, UpdatedAtUtc = now,
            };
            assignment.Units.Add(new TransportUnit
            {
                Id = Guid.CreateVersion7(), UnitCode = "1", LicensePlate = plate,
                VehicleDescription = type, VehicleType = type,
                DriverName = driver, DriverPhone = phone,
                CreatedAtUtc = now, UpdatedAtUtc = now,
            });
            db.TransportAssignments.Add(assignment);
            request.Status = TransportRequestStatus.Assigned;
            request.RevisionNumber++;
            request.WorkflowVersion++;
            request.UpdatedAtUtc = now;
            db.RequestRevisions.Add(new RequestRevision
            {
                Id = Guid.CreateVersion7(), TransportRequestId = request.Id,
                RevisionNumber = request.RevisionNumber, Status = request.Status,
                SnapshotJson = JsonSerializer.Serialize(new
                {
                    request.BookingNumber, request.Status, plate, type, driver, phone,
                }),
                ChangeSource = "ga_assignment", ChangedByEmail = await db.UserAccounts
                    .Where(x => x.Id == actorId).Select(x => x.Email).SingleAsync(cancellationToken),
                CreatedAtUtc = now,
            });
            db.WorkflowOutbox.Add(new WorkflowOutboxMessage
            {
                Id = Guid.CreateVersion7(), TransportRequestId = requestId,
                EventType = "request.assignment.requester",
                DeduplicationKey = $"assignment:{requestId:N}:{request.WorkflowVersion}:requester",
                PayloadJson = JsonSerializer.Serialize(new { requestId, status = "Assigned" }),
                Status = OutboxStatus.Pending, MaxAttempts = 8, AvailableAtUtc = now,
                CorrelationId = Guid.CreateVersion7(), CreatedAtUtc = now, UpdatedAtUtc = now,
            });
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        });
        return assigned ? await DetailAsync(actorId, requestId, cancellationToken) : null;
    }

    public async Task<GaRequestDetail?> RecordDispatchAsync(
        Guid actorId, Guid requestId, GaDispatchCommand command, CancellationToken cancellationToken)
    {
        var action = command.Action?.Trim().ToLowerInvariant() switch
        {
            "copied" => DriverDispatchAction.Copied,
            "sent" => DriverDispatchAction.Sent,
            _ => throw ValidationError("action", "Choose copied or sent."),
        };
        var now = timeProvider.GetUtcNow();
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        var recorded = await strategy.ExecuteAsync(async () =>
        {
            await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
            await EnsureAdminAsync(db, actorId, cancellationToken);
            var request = await db.TransportRequests.AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == requestId && x.Status == TransportRequestStatus.Assigned,
                    cancellationToken);
            if (request is null) return false;
            var unit = await db.TransportUnits.AsNoTracking()
                .Where(x => x.TransportAssignment.TransportRequestId == requestId)
                .SingleOrDefaultAsync(cancellationToken);
            if (unit is null) return false;
            if (action != DriverDispatchAction.Sent || !await db.DriverDispatchEvents.AnyAsync(x =>
                x.TransportRequestId == requestId && x.Action == DriverDispatchAction.Sent,
                cancellationToken))
            {
                db.DriverDispatchEvents.Add(new DriverDispatchEvent
                {
                    Id = Guid.CreateVersion7(), TransportRequestId = requestId,
                    TransportUnitId = unit.Id, Action = action,
                    Channel = "line_manual", ActorAccountId = actorId,
                    ActorEmail = await db.UserAccounts.Where(x => x.Id == actorId)
                        .Select(x => x.Email).SingleAsync(cancellationToken),
                    CreatedAtUtc = now,
                });
                await db.SaveChangesAsync(cancellationToken);
            }
            await transaction.CommitAsync(cancellationToken);
            return true;
        });
        return recorded ? await DetailAsync(actorId, requestId, cancellationToken) : null;
    }

    public async Task<GaOtRequestPage> ListOtAsync(Guid actorId, int page, CancellationToken cancellationToken)
    {
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        await EnsureAdminAsync(db, actorId, cancellationToken);
        const int pageSize = 25;
        var query = db.TransportRequests.AsNoTracking().Where(x =>
            x.RequestType == TransportRequestType.Overtime
            && x.OtVerificationMode == OtVerificationMode.TigerSpace
            && x.Status == TransportRequestStatus.PendingOtVerification);
        var total = await query.CountAsync(cancellationToken);
        var requests = await query.OrderBy(x => x.UsingDate).ThenBy(x => x.StartTime)
            .ThenBy(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(cancellationToken);
        return new GaOtRequestPage(requests.Select(x => new GaOtRequestItem(
            x.Id, x.BookingNumber, x.RequesterName,
            x.UsingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            x.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            x.OtVerificationStatus.ToString(), x.RevisionNumber)).ToArray(), page, pageSize, total);
    }

    public async Task<GaOtRequestDetail?> OtDetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken)
    {
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        await EnsureAdminAsync(db, actorId, cancellationToken);
        return await OtDetailCoreAsync(db, requestId, cancellationToken);
    }

    public async Task<GaOtRequestDetail?> VerifyOtAsync(
        Guid actorId, Guid requestId, GaOtVerifyCommand command, CancellationToken cancellationToken)
    {
        var result = command.Result?.Trim().ToLowerInvariant() switch
        {
            "verified" => OtVerificationStatus.Verified,
            "not_found" => OtVerificationStatus.NotFound,
            "rejected" => OtVerificationStatus.Rejected,
            _ => throw ValidationError("result", "Choose verified, not_found, or rejected."),
        };
        var note = command.Note?.Trim();
        if (note?.Length > 1000 || (result != OtVerificationStatus.Verified && string.IsNullOrEmpty(note)))
            throw ValidationError("note", "Enter a note of at most 1,000 characters for not found or rejected.");
        var now = timeProvider.GetUtcNow();
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        var saved = await strategy.ExecuteAsync(async () =>
        {
            await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
            await EnsureAdminAsync(db, actorId, cancellationToken);
            var request = await db.TransportRequests.SingleOrDefaultAsync(x => x.Id == requestId
                && x.RequestType == TransportRequestType.Overtime
                && x.OtVerificationMode == OtVerificationMode.TigerSpace, cancellationToken);
            if (request is null) return false;
            if (request.Status != TransportRequestStatus.PendingOtVerification
                || request.RevisionNumber != command.ExpectedRevision)
                throw new GaAssignmentConflictException("This OT request has changed. Reload before verifying.");
            request.OtVerificationStatus = result;
            request.OtVerificationNote = note;
            request.OtVerifiedAtUtc = result == OtVerificationStatus.Verified ? now : null;
            request.OtVerifiedByAccountId = actorId;
            request.Status = result switch
            {
                OtVerificationStatus.Verified => TransportRequestStatus.Approved,
                OtVerificationStatus.Rejected => TransportRequestStatus.Rejected,
                _ => TransportRequestStatus.PendingOtVerification,
            };
            request.DecisionReason = result == OtVerificationStatus.Rejected ? note : null;
            request.RevisionNumber++;
            request.WorkflowVersion++;
            request.UpdatedAtUtc = now;
            var actorEmail = await db.UserAccounts.Where(x => x.Id == actorId)
                .Select(x => x.Email).SingleAsync(cancellationToken);
            db.RequestRevisions.Add(new RequestRevision
            {
                Id = Guid.CreateVersion7(), TransportRequestId = requestId,
                RevisionNumber = request.RevisionNumber, Status = request.Status,
                SnapshotJson = JsonSerializer.Serialize(new
                {
                    request.BookingNumber, request.Status, request.OtVerificationStatus,
                    request.OtVerificationNote, request.WorkflowVersion,
                }),
                ChangeSource = "ga_ot_verification", ChangedByEmail = actorEmail,
                CreatedAtUtc = now,
            });
            db.WorkflowOutbox.Add(new WorkflowOutboxMessage
            {
                Id = Guid.CreateVersion7(), TransportRequestId = requestId,
                EventType = "request.ot_verification.decided.requester",
                DeduplicationKey = $"ot-verification:{requestId:N}:{request.WorkflowVersion}:requester",
                PayloadJson = JsonSerializer.Serialize(new
                {
                    requestId, status = request.Status.ToString(), result = result.ToString(),
                    revision = request.RevisionNumber, note,
                }),
                Status = OutboxStatus.Pending, MaxAttempts = 8, AvailableAtUtc = now,
                CorrelationId = Guid.CreateVersion7(), CreatedAtUtc = now, UpdatedAtUtc = now,
            });
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        });
        return saved ? await OtDetailAsync(actorId, requestId, cancellationToken) : null;
    }

    private static async Task<GaOtRequestDetail?> OtDetailCoreAsync(
        CarServiceDbContext db, Guid requestId, CancellationToken cancellationToken)
    {
        var request = await db.TransportRequests.AsNoTracking().Include(x => x.OvertimeRiders)
            .SingleOrDefaultAsync(x => x.Id == requestId && x.RequestType == TransportRequestType.Overtime
                && x.OtVerificationMode == OtVerificationMode.TigerSpace, cancellationToken);
        if (request is null) return null;
        return new GaOtRequestDetail(request.Id, request.BookingNumber, request.RequesterName,
            request.UsingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            request.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            request.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            request.PickupLocation, request.Destination, request.Status.ToString(),
            request.OtVerificationStatus.ToString(), request.OtVerificationNote, request.RevisionNumber,
            request.OvertimeRiders.OrderBy(x => x.Sequence).Select(x => new GaOtRider(
                x.EmployeeId, x.EmployeeName, x.EmployeeEmail, x.WorkDescription,
                x.WorkStart.ToString("HH:mm", CultureInfo.InvariantCulture),
                x.WorkEnd.ToString("HH:mm", CultureInfo.InvariantCulture), x.BusStop)).ToArray());
    }

    private static async Task<GaRequestDetail?> DetailCoreAsync(
        CarServiceDbContext db, Guid requestId, CancellationToken cancellationToken)
    {
        var request = await db.TransportRequests.AsNoTracking()
            .Include(x => x.Assignment).ThenInclude(x => x!.Units)
            .SingleOrDefaultAsync(x => x.Id == requestId
                && x.RequestType == TransportRequestType.OutsideCompany
                && (x.Status == TransportRequestStatus.Approved || x.Status == TransportRequestStatus.Assigned),
                cancellationToken);
        if (request is null) return null;
        var unit = request.Assignment?.Units.SingleOrDefault();
        var sent = unit is not null && await db.DriverDispatchEvents.AsNoTracking().AnyAsync(x =>
            x.TransportRequestId == requestId && x.Action == DriverDispatchAction.Sent,
            cancellationToken);
        var date = request.UsingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var start = request.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture);
        var end = request.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture);
        var lineMessage = unit is null ? null : string.Join("\n", new[]
        {
            $"TOKIN car service {request.BookingNumber}",
            $"Date: {date}  Time: {start}-{end}",
            $"Pickup: {request.PickupLocation}",
            $"Destination: {request.Destination}",
            $"Passenger contact: {request.RequesterName} {request.RequesterPhone}",
            $"Passengers: {request.PassengerCount}",
            $"Vehicle: {unit.VehicleType} {unit.LicensePlate}",
            $"Driver: {unit.DriverName} {unit.DriverPhone}",
        });
        return new GaRequestDetail(
            request.Id, request.BookingNumber, request.Status.ToString(), request.RevisionNumber,
            request.RequesterName, request.RequesterPhone, date, start, end,
            request.PickupLocation, request.Destination, request.Purpose, request.PassengerCount,
            unit?.LicensePlate, unit?.VehicleType, unit?.DriverName, unit?.DriverPhone,
            request.Assignment?.Notes, lineMessage, sent);
    }

    private static async Task EnsureAdminAsync(CarServiceDbContext db, Guid actorId, CancellationToken cancellationToken)
    {
        if (!await db.UserAccounts.AsNoTracking().AnyAsync(x =>
            x.Id == actorId && x.IsActive && x.Role == UserRole.Admin, cancellationToken))
            throw new UnauthorizedAccessException("GA administrator access required.");
    }

    private static string Required(string? value, string field, int maxLength)
    {
        var normalized = value?.Trim() ?? string.Empty;
        return normalized.Length is > 0 && normalized.Length <= maxLength
            ? normalized : throw ValidationError(field, $"Enter {field} (up to {maxLength} characters).");
    }

    private static PublicRequestValidationException ValidationError(string field, string message) =>
        new(new Dictionary<string, string[]>(StringComparer.Ordinal) { [field] = [message] });
}
