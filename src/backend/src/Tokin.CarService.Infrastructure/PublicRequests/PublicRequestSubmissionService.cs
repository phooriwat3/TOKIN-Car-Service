using System.Data;
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

internal sealed class PublicRequestSubmissionService(
    IDbContextFactory<CarServiceDbContext> dbContextFactory,
    ISecureActionTokenService tokenService,
    IOptions<PublicRequestOptions> options,
    TimeProvider timeProvider)
    : IPublicRequestSubmissionService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly TimeZoneInfo BangkokTimeZone = ResolveBangkokTimeZone();
    private readonly PublicRequestOptions _options = ValidateOptions(options.Value);

    public async Task<SubmitPublicRequestResult> SubmitAsync(
        SubmitPublicRequestCommand command,
        string idempotencyKey,
        string fingerprintHash,
        CancellationToken cancellationToken)
    {
        var utcNow = timeProvider.GetUtcNow();
        var bangkokNow = TimeZoneInfo.ConvertTime(utcNow, BangkokTimeZone);
        var request = PublicRequestValidator.Validate(command, _options, bangkokNow);
        var requestHash = Convert.ToHexStringLower(
            System.Security.Cryptography.SHA256.HashData(
                JsonSerializer.SerializeToUtf8Bytes(request, JsonOptions)));

        await using var strategyContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var strategy = strategyContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var transaction = await dbContext.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var existing = await dbContext.ApiIdempotencyRecords
                .AsNoTracking()
                .SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (existing is not null)
            {
                if (!string.Equals(existing.RequestHash, requestHash, StringComparison.Ordinal))
                {
                    throw new PublicRequestConflictException(
                        "This idempotency key was already used for a different request.");
                }

                var savedResult = JsonSerializer.Deserialize<SubmitPublicRequestResult>(
                    existing.ResponseJson ?? string.Empty,
                    JsonOptions) ?? throw new InvalidOperationException(
                        "The stored idempotency response is invalid.");
                await transaction.CommitAsync(cancellationToken);
                return savedResult;
            }

            var cutoff = utcNow.AddMinutes(-1);
            var recentAttempts = await dbContext.PublicRequestAttempts
                .CountAsync(
                    x => x.FingerprintHash == fingerprintHash && x.CreatedAtUtc >= cutoff,
                    cancellationToken);
            if (recentAttempts >= _options.MaximumValidSubmissionsPerMinute)
            {
                throw new PublicRequestRateLimitException();
            }

            dbContext.PublicRequestAttempts.Add(new PublicRequestAttempt
            {
                FingerprintHash = fingerprintHash,
                CreatedAtUtc = utcNow,
            });

            var department = await dbContext.Departments
                .SingleOrDefaultAsync(
                    x => x.Code == request.DepartmentCode && x.IsActive,
                    cancellationToken);
            if (department is null)
            {
                throw ValidationError(
                    "requester.department",
                    "Selected department is unavailable. Please contact Admin.");
            }

            UserAccount? approver = null;
            if (request.RequestType == TransportRequestType.OutsideCompany)
            {
                approver = await dbContext.DepartmentApprovers
                    .Where(x =>
                        x.DepartmentId == department.Id
                        && x.IsActive
                        && x.UserAccount.IsActive
                        && x.UserAccount.Role == UserRole.Approver
                        && x.UserAccount.Email == request.ApproverEmail)
                    .Select(x => x.UserAccount)
                    .SingleOrDefaultAsync(cancellationToken);
                if (approver is null)
                {
                    throw ValidationError(
                        "approver.email",
                        "Select an active approver assigned to the requester department.");
                }
            }

            var bookingNumber = await NextBookingNumberAsync(
                dbContext,
                request.UsingDate.Year,
                cancellationToken);
            var requestId = Guid.CreateVersion7();
            var transportRequest = CreateTransportRequest(
                requestId,
                bookingNumber,
                request,
                department,
                approver,
                utcNow);
            dbContext.TransportRequests.Add(transportRequest);

            AddPassengers(transportRequest, request);
            AddOvertimeRiders(transportRequest, request);

            dbContext.RequestRevisions.Add(new RequestRevision
            {
                Id = Guid.CreateVersion7(),
                TransportRequestId = requestId,
                RevisionNumber = 1,
                Status = TransportRequestStatus.PendingRequesterConfirmation,
                SnapshotJson = JsonSerializer.Serialize(request, JsonOptions),
                ChangeSource = "initial_submission",
                ChangedByEmail = request.RequesterEmail,
                CreatedAtUtc = utcNow,
            });

            var issuedToken = tokenService.Issue("requester-confirmation:v1");
            var accessTokenId = Guid.CreateVersion7();
            var expiresAtUtc = utcNow.AddHours(_options.ConfirmationTokenLifetimeHours);
            dbContext.RequestAccessTokens.Add(new RequestAccessToken
            {
                Id = accessTokenId,
                TransportRequestId = requestId,
                TokenType = AccessTokenType.RequesterConfirmation,
                TokenHash = issuedToken.TokenHash,
                RevisionNumber = 1,
                SubjectEmail = request.RequesterEmail,
                ExpiresAtUtc = expiresAtUtc,
                CreatedAtUtc = utcNow,
            });

            dbContext.WorkflowOutbox.Add(new WorkflowOutboxMessage
            {
                Id = Guid.CreateVersion7(),
                TransportRequestId = requestId,
                EventType = "request.confirmation.requested",
                DeduplicationKey = $"request-confirmation:{requestId:N}:1",
                PayloadJson = JsonSerializer.Serialize(new
                {
                    requestId,
                    bookingNumber,
                    recipientEmail = request.RequesterEmail,
                    accessTokenId,
                    protectedToken = issuedToken.ProtectedToken,
                    expiresAtUtc,
                }, JsonOptions),
                Status = OutboxStatus.Pending,
                AttemptCount = 0,
                MaxAttempts = 8,
                AvailableAtUtc = utcNow,
                CorrelationId = Guid.CreateVersion7(),
                CreatedAtUtc = utcNow,
                UpdatedAtUtc = utcNow,
            });

            var result = new SubmitPublicRequestResult(
                requestId,
                bookingNumber,
                "pending_requester_confirmation",
                utcNow);
            dbContext.ApiIdempotencyRecords.Add(new ApiIdempotencyRecord
            {
                IdempotencyKey = idempotencyKey,
                Endpoint = "POST /api/v1/requests",
                RequestHash = requestHash,
                StatusCode = 201,
                ResponseJson = JsonSerializer.Serialize(result, JsonOptions),
                CreatedAtUtc = utcNow,
                ExpiresAtUtc = utcNow.AddHours(24),
            });

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        });
    }

    private static async Task<string> NextBookingNumberAsync(
        CarServiceDbContext dbContext,
        int year,
        CancellationToken cancellationToken)
    {
        var counter = await dbContext.BookingYearCounters
            .SingleOrDefaultAsync(x => x.Year == year, cancellationToken);
        if (counter is null)
        {
            counter = new BookingYearCounter { Year = year, LastSequence = 1 };
            dbContext.BookingYearCounters.Add(counter);
        }
        else
        {
            counter.LastSequence++;
        }

        if (counter.LastSequence > 999_999)
        {
            throw new InvalidOperationException("The yearly booking-number range is exhausted.");
        }

        return FormattableString.Invariant($"CSR-{year:D4}-{counter.LastSequence:D6}");
    }

    private static TransportRequest CreateTransportRequest(
        Guid requestId,
        string bookingNumber,
        ValidatedPublicRequest request,
        Department department,
        UserAccount? approver,
        DateTimeOffset utcNow)
    {
        var isOvertime = request.RequestType == TransportRequestType.Overtime;
        return new TransportRequest
        {
            Id = requestId,
            BookingNumber = bookingNumber,
            DepartmentId = department.Id,
            RequesterEmployeeId = request.RequesterEmployeeId,
            RequesterName = request.RequesterName,
            RequesterEmail = request.RequesterEmail,
            RequesterPhone = request.RequesterPhone,
            RequesterDepartmentName = department.Name,
            Status = TransportRequestStatus.PendingRequesterConfirmation,
            RequestType = request.RequestType,
            Origin = RequestOrigin.Employee,
            Category = isOvertime ? RequestCategory.OvertimeTransport : RequestCategory.BusinessTrip,
            ApproverAccountId = approver?.Id,
            ApproverName = approver?.FullName ?? request.ApproverName,
            ApproverEmail = approver?.Email,
            UsingDate = request.UsingDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            PickupLocation = request.PickupLocation,
            Destination = request.Destination,
            Purpose = request.Purpose,
            PassengerCount = isOvertime
                ? request.OvertimeRiders.Count
                : Math.Max(1, request.Passengers.Count),
            MeetingPoint = request.MeetingPoint,
            WithStaff = request.WithStaff,
            VehiclePreference = VehiclePreference.Any,
            DriverRequired = true,
            IsUrgent = request.IsImmediate || request.IsLateOt,
            UrgentReason = request.UrgentReason,
            IsAfterHours = isOvertime,
            SourceSystem = isOvertime ? "tiger_space" : "transport_portal",
            SourceConfirmed = isOvertime && request.TigerSpaceConfirmed,
            OtVerificationStatus = isOvertime
                ? OtVerificationStatus.Pending
                : OtVerificationStatus.NotRequired,
            OtVerificationMode = OtVerificationMode.TigerSpace,
            RevisionNumber = 1,
            WorkflowVersion = 1,
            LastSubmittedAtUtc = utcNow,
            CreatedAtUtc = utcNow,
            UpdatedAtUtc = utcNow,
        };
    }

    private static void AddPassengers(
        TransportRequest transportRequest,
        ValidatedPublicRequest request)
    {
        for (var index = 0; index < request.Passengers.Count; index++)
        {
            transportRequest.Passengers.Add(new RequestPassenger
            {
                Id = Guid.CreateVersion7(),
                Name = request.Passengers[index],
                Sequence = index,
            });
        }
    }

    private static void AddOvertimeRiders(
        TransportRequest transportRequest,
        ValidatedPublicRequest request)
    {
        for (var index = 0; index < request.OvertimeRiders.Count; index++)
        {
            var rider = request.OvertimeRiders[index];
            transportRequest.OvertimeRiders.Add(new OvertimeRider
            {
                Id = Guid.CreateVersion7(),
                EmployeeId = rider.EmployeeId,
                EmployeeName = rider.EmployeeName,
                EmployeeEmail = rider.EmployeeEmail,
                EmployeePhone = rider.EmployeePhone,
                WorkDescription = rider.WorkDescription,
                WorkStart = rider.WorkStart,
                WorkEnd = rider.WorkEnd,
                TotalWeeklyHours = rider.TotalWeeklyHours,
                TransportRequired = true,
                BusStop = rider.BusStop,
                Sequence = index,
            });
        }
    }

    private static PublicRequestValidationException ValidationError(
        string field,
        string message)
    {
        return new PublicRequestValidationException(
            new Dictionary<string, string[]>(StringComparer.Ordinal)
            {
                [field] = [message],
            });
    }

    private static PublicRequestOptions ValidateOptions(PublicRequestOptions options)
    {
        if (options.AllowedEmailDomains.Count == 0
            || options.ConfirmationTokenLifetimeHours is < 1 or > 720
            || options.MaximumValidSubmissionsPerMinute is < 1 or > 1000)
        {
            throw new InvalidOperationException("Public request options are invalid.");
        }

        return options;
    }

    private static TimeZoneInfo ResolveBangkokTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
    }
}
