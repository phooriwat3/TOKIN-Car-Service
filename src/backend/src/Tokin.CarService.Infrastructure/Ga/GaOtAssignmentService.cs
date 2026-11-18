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

internal sealed class GaOtAssignmentService(
    IDbContextFactory<CarServiceDbContext> dbContextFactory,
    TimeProvider timeProvider) : IGaOtAssignmentService
{
    private sealed record ValidatedUnit(string Plate, string Type, string Driver, string Phone,
        IReadOnlyList<Guid> RiderIds);

    public async Task<GaRequestPage> ListAsync(Guid actorId, int page, CancellationToken cancellationToken)
    {
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        await EnsureAdminAsync(db, actorId, cancellationToken);
        const int pageSize = 25;
        var query = db.TransportRequests.AsNoTracking().Where(x =>
            x.RequestType == TransportRequestType.Overtime
            && x.OtVerificationStatus == OtVerificationStatus.Verified
            && (x.Status == TransportRequestStatus.Approved || x.Status == TransportRequestStatus.Assigned));
        var total = await query.CountAsync(cancellationToken);
        var requests = await query.OrderBy(x => x.Status == TransportRequestStatus.Approved ? 0 : 1)
            .ThenBy(x => x.UsingDate).ThenBy(x => x.StartTime).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(cancellationToken);
        return new GaRequestPage(requests.Select(x => new GaRequestListItem(
            x.Id, x.BookingNumber, x.Status.ToString(), x.RequesterName,
            x.UsingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            x.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            x.PickupLocation, x.Destination)).ToArray(), page, pageSize, total);
    }

    public async Task<GaOtAssignmentDetail?> DetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken)
    {
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        await EnsureAdminAsync(db, actorId, cancellationToken);
        var request = await db.TransportRequests.AsNoTracking()
            .Include(x => x.OvertimeRiders)
            .Include(x => x.Assignment).ThenInclude(x => x!.Units).ThenInclude(x => x.Riders)
            .SingleOrDefaultAsync(x => x.Id == requestId
                && x.RequestType == TransportRequestType.Overtime
                && x.OtVerificationStatus == OtVerificationStatus.Verified
                && (x.Status == TransportRequestStatus.Approved || x.Status == TransportRequestStatus.Assigned),
                cancellationToken);
        if (request is null) return null;
        var sentIds = await db.DriverDispatchEvents.AsNoTracking()
            .Where(x => x.TransportRequestId == requestId && x.Action == DriverDispatchAction.Sent
                && x.TransportUnitId != null)
            .Select(x => x.TransportUnitId!.Value).ToArrayAsync(cancellationToken);
        var sent = sentIds.ToHashSet();
        var date = request.UsingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var start = request.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture);
        var end = request.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture);
        var riders = request.OvertimeRiders.OrderBy(x => x.Sequence).Select(x =>
            new GaOtAssignmentRider(x.Id, x.EmployeeId, x.EmployeeName, x.EmployeePhone, x.BusStop)).ToArray();
        var riderById = request.OvertimeRiders.ToDictionary(x => x.Id);
        var units = (request.Assignment?.Units ?? []).OrderBy(x =>
                int.TryParse(x.UnitCode, NumberStyles.None, CultureInfo.InvariantCulture, out var number)
                    ? number : int.MaxValue)
            .ThenBy(x => x.UnitCode, StringComparer.Ordinal)
            .Select(unit =>
            {
                var assignedRiders = unit.Riders.Select(x => riderById[x.OvertimeRiderId])
                    .OrderBy(x => x.Sequence).ToArray();
                var lineMessage = string.Join("\n", new[]
                {
                    $"TOKIN OT transport {request.BookingNumber} / Vehicle {unit.UnitCode}",
                    $"Date: {date}  Time: {start}-{end}",
                    $"Pickup: {request.PickupLocation}",
                    $"Destination: {request.Destination}",
                    $"Vehicle: {unit.VehicleType} {unit.LicensePlate}",
                    $"Driver: {unit.DriverName} {unit.DriverPhone}",
                    "Riders:",
                }.Concat(assignedRiders.Select(x =>
                    $"- {x.EmployeeName} / {x.BusStop} / {x.EmployeePhone ?? "No phone"}")));
                return new GaOtAssignmentUnit(unit.Id, unit.UnitCode, unit.LicensePlate,
                    unit.VehicleType, unit.DriverName, unit.DriverPhone,
                    assignedRiders.Select(x => x.Id).ToArray(), lineMessage, sent.Contains(unit.Id));
            }).ToArray();
        return new GaOtAssignmentDetail(request.Id, request.BookingNumber, request.Status.ToString(),
            request.RevisionNumber, request.RequesterName, date, start, end,
            request.PickupLocation, request.Destination, request.Assignment?.Notes, riders, units);
    }

    public async Task<GaOtAssignmentDetail?> AssignAsync(Guid actorId, Guid requestId,
        GaOtAssignCommand command, CancellationToken cancellationToken)
    {
        if (command.Units is not { Count: > 0 and <= 20 })
            throw Error("units", "Add between 1 and 20 vehicles.");
        var units = command.Units.Select((unit, index) =>
        {
            if (unit.RiderIds is not { Count: > 0 and <= 20 })
                throw Error($"units[{index}].riderIds", "Select at least one rider for each vehicle.");
            return new ValidatedUnit(
                Required(unit.LicensePlate, $"units[{index}].licensePlate", 40),
                Required(unit.VehicleType, $"units[{index}].vehicleType", 80),
                Required(unit.DriverName, $"units[{index}].driverName", 160),
                Required(unit.DriverPhone, $"units[{index}].driverPhone", 40), unit.RiderIds);
        }).ToArray();
        var notes = command.Notes?.Trim();
        if (notes?.Length > 2000) throw Error("notes", "Notes must be at most 2,000 characters.");
        var riderIds = units.SelectMany(x => x.RiderIds).ToArray();
        if (riderIds.Length != riderIds.Distinct().Count())
            throw Error("units", "Each rider must be in exactly one vehicle.");

        var now = timeProvider.GetUtcNow();
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        var assigned = await strategy.ExecuteAsync(async () =>
        {
            await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
            await EnsureAdminAsync(db, actorId, cancellationToken);
            var request = await db.TransportRequests.Include(x => x.OvertimeRiders)
                .SingleOrDefaultAsync(x => x.Id == requestId && x.RequestType == TransportRequestType.Overtime,
                    cancellationToken);
            if (request is null) return false;
            if (request.Status != TransportRequestStatus.Approved
                || request.OtVerificationStatus != OtVerificationStatus.Verified
                || request.RevisionNumber != command.ExpectedRevision
                || await db.TransportAssignments.AnyAsync(x => x.TransportRequestId == requestId, cancellationToken))
                throw new GaAssignmentConflictException("This OT request has changed. Reload before assigning.");
            var expectedIds = request.OvertimeRiders.Where(x => x.TransportRequired).Select(x => x.Id).ToHashSet();
            if (expectedIds.Count == 0 || !expectedIds.SetEquals(riderIds))
                throw Error("units", "Assign every rider requesting transport to exactly one vehicle.");

            var assignment = new TransportAssignment
            {
                Id = Guid.CreateVersion7(), TransportRequestId = requestId,
                AssignedByAccountId = actorId, Notes = notes,
                AssignedAtUtc = now, CreatedAtUtc = now, UpdatedAtUtc = now,
            };
            for (var index = 0; index < units.Length; index++)
            {
                var input = units[index];
                var unit = new TransportUnit
                {
                    Id = Guid.CreateVersion7(), UnitCode = (index + 1).ToString(CultureInfo.InvariantCulture),
                    LicensePlate = input.Plate, VehicleDescription = input.Type,
                    VehicleType = input.Type, DriverName = input.Driver, DriverPhone = input.Phone,
                    CreatedAtUtc = now, UpdatedAtUtc = now,
                };
                foreach (var riderId in input.RiderIds)
                    unit.Riders.Add(new TransportUnitRider { OvertimeRiderId = riderId });
                assignment.Units.Add(unit);
            }
            db.TransportAssignments.Add(assignment);
            request.Status = TransportRequestStatus.Assigned;
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
                    request.BookingNumber, request.Status, request.WorkflowVersion,
                    units = assignment.Units.Select(x => new
                    {
                        x.UnitCode, x.LicensePlate, x.VehicleType, x.DriverName, x.DriverPhone,
                        riderIds = x.Riders.Select(r => r.OvertimeRiderId),
                    }),
                }),
                ChangeSource = "ga_ot_assignment", ChangedByEmail = actorEmail,
                CreatedAtUtc = now,
            });
            db.WorkflowOutbox.Add(new WorkflowOutboxMessage
            {
                Id = Guid.CreateVersion7(), TransportRequestId = requestId,
                EventType = "request.ot_assignment.requester",
                DeduplicationKey = $"ot-assignment:{requestId:N}:{request.WorkflowVersion}:requester",
                PayloadJson = JsonSerializer.Serialize(new { requestId, revision = request.RevisionNumber }),
                Status = OutboxStatus.Pending, MaxAttempts = 8, AvailableAtUtc = now,
                CorrelationId = Guid.CreateVersion7(), CreatedAtUtc = now, UpdatedAtUtc = now,
            });
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        });
        return assigned ? await DetailAsync(actorId, requestId, cancellationToken) : null;
    }

    public async Task<GaOtAssignmentDetail?> RecordDispatchAsync(Guid actorId, Guid requestId,
        Guid unitId, GaDispatchCommand command, CancellationToken cancellationToken)
    {
        var action = command.Action?.Trim().ToLowerInvariant() switch
        {
            "copied" => DriverDispatchAction.Copied,
            "sent" => DriverDispatchAction.Sent,
            _ => throw Error("action", "Choose copied or sent."),
        };
        var now = timeProvider.GetUtcNow();
        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        var recorded = await strategy.ExecuteAsync(async () =>
        {
            await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
            await EnsureAdminAsync(db, actorId, cancellationToken);
            var unit = await db.TransportUnits.AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == unitId && x.TransportAssignment.TransportRequestId == requestId
                    && x.TransportAssignment.TransportRequest.RequestType == TransportRequestType.Overtime
                    && x.TransportAssignment.TransportRequest.Status == TransportRequestStatus.Assigned,
                    cancellationToken);
            if (unit is null) return false;
            if (action != DriverDispatchAction.Sent || !await db.DriverDispatchEvents.AnyAsync(x =>
                x.TransportUnitId == unitId && x.Action == DriverDispatchAction.Sent, cancellationToken))
            {
                db.DriverDispatchEvents.Add(new DriverDispatchEvent
                {
                    Id = Guid.CreateVersion7(), TransportRequestId = requestId,
                    TransportUnitId = unitId, Action = action, Channel = "line_manual",
                    ActorAccountId = actorId,
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
            ? normalized : throw Error(field, $"Enter {field} (up to {maxLength} characters).");
    }

    private static PublicRequestValidationException Error(string field, string message) =>
        new(new Dictionary<string, string[]>(StringComparer.Ordinal) { [field] = [message] });
}
