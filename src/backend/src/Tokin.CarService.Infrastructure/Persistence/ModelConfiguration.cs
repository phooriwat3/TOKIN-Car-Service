using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Domain.Audit;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Domain.Requests;
using Tokin.CarService.Domain.Security;
using Tokin.CarService.Domain.Workflow;

namespace Tokin.CarService.Infrastructure.Persistence;

internal static class ModelConfiguration
{
    private const string NewGuidSql = "NEWSEQUENTIALID()";
    private const string UtcNowSql = "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')";

    public static void ConfigureReferenceData(ModelBuilder modelBuilder)
    {
        var department = modelBuilder.Entity<Department>();
        department.ToTable("Departments", "core");
        department.HasKey(x => x.Id);
        department.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        department.Property(x => x.Code).HasMaxLength(30).IsRequired();
        department.Property(x => x.Name).HasMaxLength(160).IsRequired();
        department.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        department.Property(x => x.UpdatedAtUtc).HasDefaultValueSql(UtcNowSql);
        department.Property(x => x.RowVersion).IsRowVersion();
        department.HasIndex(x => x.Code).IsUnique();
        department.HasIndex(x => new { x.IsActive, x.Name });

        var user = modelBuilder.Entity<UserAccount>();
        user.ToTable("UserAccounts", "core");
        user.HasKey(x => x.Id);
        user.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        user.Property(x => x.EmployeeId).HasMaxLength(40).IsRequired();
        user.Property(x => x.FullName).HasMaxLength(160).IsRequired();
        user.Property(x => x.Email).HasMaxLength(320).IsRequired();
        user.Property(x => x.Role).HasConversion<string>().HasMaxLength(30);
        user.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        user.Property(x => x.UpdatedAtUtc).HasDefaultValueSql(UtcNowSql);
        user.Property(x => x.RowVersion).IsRowVersion();
        user.HasIndex(x => x.EmployeeId).IsUnique();
        user.HasIndex(x => x.Email).IsUnique();
        user.HasIndex(x => new { x.Role, x.IsActive });
        user.HasOne(x => x.Department)
            .WithMany(x => x.Users)
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.NoAction);

        var approver = modelBuilder.Entity<DepartmentApprover>();
        approver.ToTable("DepartmentApprovers", "core");
        approver.HasKey(x => new { x.DepartmentId, x.UserAccountId });
        approver.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        approver.Property(x => x.UpdatedAtUtc).HasDefaultValueSql(UtcNowSql);
        approver.HasIndex(x => new { x.DepartmentId, x.IsActive });
        approver.HasOne(x => x.Department)
            .WithMany(x => x.Approvers)
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.Cascade);
        approver.HasOne(x => x.UserAccount)
            .WithMany()
            .HasForeignKey(x => x.UserAccountId)
            .OnDelete(DeleteBehavior.NoAction);

        var employee = modelBuilder.Entity<EmployeeDirectoryEntry>();
        employee.ToTable("EmployeeDirectory", "core");
        employee.HasKey(x => x.Id);
        employee.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        employee.Property(x => x.EmployeeId).HasMaxLength(40).IsRequired();
        employee.Property(x => x.FullName).HasMaxLength(160).IsRequired();
        employee.Property(x => x.Email).HasMaxLength(320).IsRequired();
        employee.Property(x => x.DepartmentName).HasMaxLength(160).IsRequired();
        employee.Property(x => x.JobTitle).HasMaxLength(160);
        employee.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        employee.Property(x => x.UpdatedAtUtc).HasDefaultValueSql(UtcNowSql);
        employee.Property(x => x.RowVersion).IsRowVersion();
        employee.HasIndex(x => x.EmployeeId).IsUnique();
        employee.HasIndex(x => x.Email).IsUnique();
        employee.HasIndex(x => new { x.IsActive, x.FullName, x.EmployeeId });
    }

    public static void ConfigureRequests(ModelBuilder modelBuilder)
    {
        var request = modelBuilder.Entity<TransportRequest>();
        request.ToTable("TransportRequests", "transport", table =>
        {
            table.HasCheckConstraint("CK_TransportRequests_Time", "[EndTime] > [StartTime]");
            table.HasCheckConstraint("CK_TransportRequests_PassengerCount", "[PassengerCount] BETWEEN 1 AND 100");
            table.HasCheckConstraint("CK_TransportRequests_UrgentReason", "[IsUrgent] = 0 OR LEN(LTRIM(RTRIM(ISNULL([UrgentReason], '')))) > 0");
            table.HasCheckConstraint("CK_TransportRequests_Revisions", "[RevisionNumber] > 0 AND [WorkflowVersion] > 0");
        });
        request.HasKey(x => x.Id);
        request.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        request.Property(x => x.BookingNumber).HasMaxLength(30).IsRequired();
        request.Property(x => x.RequesterEmployeeId).HasMaxLength(40).IsRequired();
        request.Property(x => x.RequesterName).HasMaxLength(160).IsRequired();
        request.Property(x => x.RequesterEmail).HasMaxLength(320).IsRequired();
        request.Property(x => x.RequesterPhone).HasMaxLength(40);
        request.Property(x => x.RequesterDepartmentName).HasMaxLength(160).IsRequired();
        request.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
        request.Property(x => x.RequestType).HasConversion<string>().HasMaxLength(30);
        request.Property(x => x.Origin).HasConversion<string>().HasMaxLength(30);
        request.Property(x => x.Category).HasConversion<string>().HasMaxLength(40);
        request.Property(x => x.ApproverName).HasMaxLength(160);
        request.Property(x => x.ApproverEmail).HasMaxLength(320);
        request.Property(x => x.PickupLocation).HasMaxLength(500).IsRequired();
        request.Property(x => x.Destination).HasMaxLength(500).IsRequired();
        request.Property(x => x.Purpose).HasMaxLength(1000).IsRequired();
        request.Property(x => x.MeetingPoint).HasConversion<string>().HasMaxLength(30);
        request.Property(x => x.VehiclePreference).HasConversion<string>().HasMaxLength(30);
        request.Property(x => x.UrgentReason).HasMaxLength(1000);
        request.Property(x => x.SourceSystem).HasMaxLength(80).IsRequired();
        request.Property(x => x.SourceReference).HasMaxLength(200);
        request.Property(x => x.OtVerificationStatus).HasConversion<string>().HasMaxLength(30);
        request.Property(x => x.OtVerificationMode).HasConversion<string>().HasMaxLength(30);
        request.Property(x => x.OtVerificationNote).HasMaxLength(1000);
        request.Property(x => x.CreatedByName).HasMaxLength(160);
        request.Property(x => x.DecisionReason).HasMaxLength(1000);
        request.Property(x => x.LastSubmittedAtUtc).HasDefaultValueSql(UtcNowSql);
        request.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        request.Property(x => x.UpdatedAtUtc).HasDefaultValueSql(UtcNowSql);
        request.Property(x => x.RowVersion).IsRowVersion();
        request.HasIndex(x => x.BookingNumber).IsUnique();
        request.HasIndex(x => new { x.Status, x.UsingDate });
        request.HasIndex(x => new { x.DepartmentId, x.UsingDate });
        request.HasIndex(x => x.RequesterEmployeeId);
        request.HasIndex(x => new { x.RequestType, x.OtVerificationStatus, x.UsingDate });
        request.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.NoAction);
        request.HasOne(x => x.RequesterAccount).WithMany().HasForeignKey(x => x.RequesterAccountId).OnDelete(DeleteBehavior.NoAction);
        request.HasOne(x => x.ApproverAccount).WithMany().HasForeignKey(x => x.ApproverAccountId).OnDelete(DeleteBehavior.NoAction);
        request.HasOne(x => x.OtVerifiedByAccount).WithMany().HasForeignKey(x => x.OtVerifiedByAccountId).OnDelete(DeleteBehavior.NoAction);
        request.HasOne(x => x.CreatedByAccount).WithMany().HasForeignKey(x => x.CreatedByAccountId).OnDelete(DeleteBehavior.NoAction);

        var passenger = modelBuilder.Entity<RequestPassenger>();
        passenger.ToTable("RequestPassengers", "transport");
        passenger.HasKey(x => x.Id);
        passenger.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        passenger.Property(x => x.Name).HasMaxLength(160).IsRequired();
        passenger.HasIndex(x => new { x.TransportRequestId, x.Sequence }).IsUnique();
        passenger.HasOne(x => x.TransportRequest).WithMany(x => x.Passengers).HasForeignKey(x => x.TransportRequestId).OnDelete(DeleteBehavior.Cascade);

        var rider = modelBuilder.Entity<OvertimeRider>();
        rider.ToTable("OvertimeRiders", "transport", table =>
        {
            table.HasCheckConstraint("CK_OvertimeRiders_Time", "[WorkEnd] > [WorkStart]");
            table.HasCheckConstraint("CK_OvertimeRiders_Hours", "[TotalWeeklyHours] BETWEEN 0 AND 168");
            table.HasCheckConstraint("CK_OvertimeRiders_BusStop", "[TransportRequired] = 0 OR LEN(LTRIM(RTRIM(ISNULL([BusStop], '')))) > 0");
        });
        rider.HasKey(x => x.Id);
        rider.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        rider.Property(x => x.EmployeeId).HasMaxLength(40).IsRequired();
        rider.Property(x => x.EmployeeName).HasMaxLength(160).IsRequired();
        rider.Property(x => x.EmployeeEmail).HasMaxLength(320);
        rider.Property(x => x.EmployeePhone).HasMaxLength(40);
        rider.Property(x => x.WorkDescription).HasMaxLength(1000).IsRequired();
        rider.Property(x => x.TotalWeeklyHours).HasPrecision(6, 2);
        rider.Property(x => x.BusStop).HasMaxLength(300);
        rider.HasIndex(x => new { x.TransportRequestId, x.EmployeeId }).IsUnique();
        rider.HasOne(x => x.TransportRequest).WithMany(x => x.OvertimeRiders).HasForeignKey(x => x.TransportRequestId).OnDelete(DeleteBehavior.Cascade);

        var approval = modelBuilder.Entity<ApprovalRecord>();
        approval.ToTable("ApprovalRecords", "transport");
        approval.HasKey(x => x.Id);
        approval.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        approval.Property(x => x.ApproverName).HasMaxLength(160).IsRequired();
        approval.Property(x => x.ApproverEmail).HasMaxLength(320).IsRequired();
        approval.Property(x => x.Action).HasConversion<string>().HasMaxLength(30);
        approval.Property(x => x.Comments).HasMaxLength(2000);
        approval.Property(x => x.Source).HasMaxLength(30).IsRequired();
        approval.Property(x => x.ActedAtUtc).HasDefaultValueSql(UtcNowSql);
        approval.HasIndex(x => new { x.TransportRequestId, x.ActedAtUtc });
        approval.HasOne(x => x.TransportRequest).WithMany(x => x.Approvals).HasForeignKey(x => x.TransportRequestId).OnDelete(DeleteBehavior.Cascade);
        approval.HasOne(x => x.ApproverAccount).WithMany().HasForeignKey(x => x.ApproverAccountId).OnDelete(DeleteBehavior.NoAction);

        var revision = modelBuilder.Entity<RequestRevision>();
        revision.ToTable("RequestRevisions", "transport", table =>
            table.HasCheckConstraint("CK_RequestRevisions_SnapshotJson", "ISJSON([SnapshotJson]) = 1"));
        revision.HasKey(x => x.Id);
        revision.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        revision.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
        revision.Property(x => x.SnapshotJson).HasColumnType("nvarchar(max)").IsRequired();
        revision.Property(x => x.ChangeSource).HasMaxLength(40).IsRequired();
        revision.Property(x => x.ChangedByEmail).HasMaxLength(320);
        revision.Property(x => x.ChangeReason).HasMaxLength(1000);
        revision.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        revision.HasIndex(x => new { x.TransportRequestId, x.RevisionNumber }).IsUnique();
        revision.HasOne(x => x.TransportRequest).WithMany(x => x.Revisions).HasForeignKey(x => x.TransportRequestId).OnDelete(DeleteBehavior.Cascade);

        var counter = modelBuilder.Entity<BookingYearCounter>();
        counter.ToTable("BookingYearCounters", "transport", table =>
        {
            table.HasCheckConstraint("CK_BookingYearCounters_Year", "[Year] BETWEEN 2020 AND 9999");
            table.HasCheckConstraint("CK_BookingYearCounters_Sequence", "[LastSequence] >= 0");
        });
        counter.HasKey(x => x.Year);
    }

    public static void ConfigureAssignments(ModelBuilder modelBuilder)
    {
        var assignment = modelBuilder.Entity<TransportAssignment>();
        assignment.ToTable("TransportAssignments", "transport");
        assignment.HasKey(x => x.Id);
        assignment.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        assignment.Property(x => x.Notes).HasMaxLength(2000);
        assignment.Property(x => x.AssignedAtUtc).HasDefaultValueSql(UtcNowSql);
        assignment.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        assignment.Property(x => x.UpdatedAtUtc).HasDefaultValueSql(UtcNowSql);
        assignment.Property(x => x.RowVersion).IsRowVersion();
        assignment.HasIndex(x => x.TransportRequestId).IsUnique();
        assignment.HasOne(x => x.TransportRequest).WithOne(x => x.Assignment).HasForeignKey<TransportAssignment>(x => x.TransportRequestId).OnDelete(DeleteBehavior.Cascade);
        assignment.HasOne(x => x.AssignedByAccount).WithMany().HasForeignKey(x => x.AssignedByAccountId).OnDelete(DeleteBehavior.NoAction);

        var unit = modelBuilder.Entity<TransportUnit>();
        unit.ToTable("TransportUnits", "transport", table =>
            table.HasCheckConstraint("CK_TransportUnits_TripRate", "[TripRateThb] IS NULL OR [TripRateThb] >= 0"));
        unit.HasKey(x => x.Id);
        unit.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        unit.Property(x => x.UnitCode).HasMaxLength(80).IsRequired();
        unit.Property(x => x.LicensePlate).HasMaxLength(40).IsRequired();
        unit.Property(x => x.VehicleDescription).HasMaxLength(200).IsRequired();
        unit.Property(x => x.VehicleType).HasMaxLength(80).IsRequired();
        unit.Property(x => x.DriverName).HasMaxLength(160).IsRequired();
        unit.Property(x => x.DriverPhone).HasMaxLength(40).IsRequired();
        unit.Property(x => x.ContractorName).HasMaxLength(160);
        unit.Property(x => x.TripRateThb).HasPrecision(12, 2);
        unit.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        unit.Property(x => x.UpdatedAtUtc).HasDefaultValueSql(UtcNowSql);
        unit.HasIndex(x => new { x.TransportAssignmentId, x.UnitCode }).IsUnique();
        unit.HasOne(x => x.TransportAssignment).WithMany(x => x.Units).HasForeignKey(x => x.TransportAssignmentId).OnDelete(DeleteBehavior.Cascade);

        var unitRider = modelBuilder.Entity<TransportUnitRider>();
        unitRider.ToTable("TransportUnitRiders", "transport");
        unitRider.HasKey(x => new { x.TransportUnitId, x.OvertimeRiderId });
        unitRider.HasOne(x => x.TransportUnit).WithMany(x => x.Riders).HasForeignKey(x => x.TransportUnitId).OnDelete(DeleteBehavior.Cascade);
        unitRider.HasOne(x => x.OvertimeRider).WithMany().HasForeignKey(x => x.OvertimeRiderId).OnDelete(DeleteBehavior.NoAction);

        var dispatch = modelBuilder.Entity<DriverDispatchEvent>();
        dispatch.ToTable("DriverDispatchEvents", "transport");
        dispatch.HasKey(x => x.Id);
        dispatch.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        dispatch.Property(x => x.Action).HasConversion<string>().HasMaxLength(40);
        dispatch.Property(x => x.Channel).HasMaxLength(40).IsRequired();
        dispatch.Property(x => x.ActorEmail).HasMaxLength(320);
        dispatch.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        dispatch.HasIndex(x => new { x.TransportRequestId, x.CreatedAtUtc });
        dispatch.HasOne(x => x.TransportRequest).WithMany().HasForeignKey(x => x.TransportRequestId).OnDelete(DeleteBehavior.Cascade);
        dispatch.HasOne(x => x.TransportUnit).WithMany().HasForeignKey(x => x.TransportUnitId).OnDelete(DeleteBehavior.NoAction);
        dispatch.HasOne(x => x.ActorAccount).WithMany().HasForeignKey(x => x.ActorAccountId).OnDelete(DeleteBehavior.NoAction);
    }

    public static void ConfigureSecurity(ModelBuilder modelBuilder)
    {
        var token = modelBuilder.Entity<RequestAccessToken>();
        token.ToTable("RequestAccessTokens", "security", table =>
        {
            table.HasCheckConstraint("CK_RequestAccessTokens_Hash", "LEN([TokenHash]) = 64 AND [TokenHash] NOT LIKE '%[^0-9a-f]%'");
            table.HasCheckConstraint("CK_RequestAccessTokens_Expiry", "[ExpiresAtUtc] > [CreatedAtUtc]");
        });
        token.HasKey(x => x.Id);
        token.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        token.Property(x => x.TokenType).HasConversion<string>().HasMaxLength(40);
        token.Property(x => x.TokenHash).HasMaxLength(64).IsUnicode(false).IsRequired();
        token.Property(x => x.SubjectEmail).HasMaxLength(320).IsRequired();
        token.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        token.HasIndex(x => x.TokenHash).IsUnique();
        token.HasIndex(x => new { x.TransportRequestId, x.RevisionNumber, x.CreatedAtUtc });
        token.HasIndex(x => new { x.TransportRequestId, x.TokenType }).IsUnique().HasFilter("[UsedAtUtc] IS NULL AND [RevokedAtUtc] IS NULL");
        token.HasIndex(x => x.ExpiresAtUtc).HasFilter("[UsedAtUtc] IS NULL AND [RevokedAtUtc] IS NULL");
        token.HasOne(x => x.TransportRequest).WithMany().HasForeignKey(x => x.TransportRequestId).OnDelete(DeleteBehavior.Cascade);

        var idempotency = modelBuilder.Entity<ApiIdempotencyRecord>();
        idempotency.ToTable("ApiIdempotencyRecords", "security", table =>
            table.HasCheckConstraint("CK_ApiIdempotencyRecords_ResponseJson", "[ResponseJson] IS NULL OR ISJSON([ResponseJson]) = 1"));
        idempotency.HasKey(x => x.IdempotencyKey);
        idempotency.Property(x => x.IdempotencyKey).HasMaxLength(200);
        idempotency.Property(x => x.Endpoint).HasMaxLength(200).IsRequired();
        idempotency.Property(x => x.RequestHash).HasMaxLength(64).IsUnicode(false).IsRequired();
        idempotency.Property(x => x.ResponseJson).HasColumnType("nvarchar(max)");
        idempotency.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        idempotency.HasIndex(x => x.ExpiresAtUtc);
    }

    public static void ConfigureWorkflowAndAudit(ModelBuilder modelBuilder)
    {
        var outbox = modelBuilder.Entity<WorkflowOutboxMessage>();
        outbox.ToTable("OutboxMessages", "workflow", table =>
        {
            table.HasCheckConstraint("CK_OutboxMessages_PayloadJson", "ISJSON([PayloadJson]) = 1");
            table.HasCheckConstraint("CK_OutboxMessages_Attempts", "[AttemptCount] >= 0 AND [MaxAttempts] BETWEEN 1 AND 1000");
            table.HasCheckConstraint("CK_OutboxMessages_SchemaVersion", "[SchemaVersion] = 1");
        });
        outbox.HasKey(x => x.Id);
        outbox.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        outbox.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        outbox.Property(x => x.DeduplicationKey).HasMaxLength(240).IsRequired();
        outbox.Property(x => x.PayloadJson).HasColumnType("nvarchar(max)").IsRequired();
        outbox.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        outbox.Property(x => x.LastError).HasMaxLength(500);
        outbox.Property(x => x.AvailableAtUtc).HasDefaultValueSql(UtcNowSql);
        outbox.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        outbox.Property(x => x.UpdatedAtUtc).HasDefaultValueSql(UtcNowSql);
        outbox.Property(x => x.RowVersion).IsRowVersion();
        outbox.HasIndex(x => x.DeduplicationKey).IsUnique();
        outbox.HasIndex(x => new { x.Status, x.AvailableAtUtc, x.CreatedAtUtc });
        outbox.HasIndex(x => new { x.TransportRequestId, x.CreatedAtUtc });
        outbox.HasOne(x => x.TransportRequest).WithMany().HasForeignKey(x => x.TransportRequestId).OnDelete(DeleteBehavior.NoAction);

        var delivery = modelBuilder.Entity<WorkflowDelivery>();
        delivery.ToTable("DeliveryAttempts", "workflow", table =>
            table.HasCheckConstraint("CK_DeliveryAttempts_HttpStatus", "[HttpStatus] IS NULL OR [HttpStatus] BETWEEN 100 AND 599"));
        delivery.HasKey(x => x.Id);
        delivery.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        delivery.Property(x => x.Channel).HasMaxLength(40).IsRequired();
        delivery.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        delivery.Property(x => x.ProviderRunId).HasMaxLength(240);
        delivery.Property(x => x.SanitizedError).HasMaxLength(500);
        delivery.HasIndex(x => new { x.OutboxMessageId, x.AttemptNumber, x.Channel }).IsUnique();
        delivery.HasOne(x => x.OutboxMessage).WithMany(x => x.Deliveries).HasForeignKey(x => x.OutboxMessageId).OnDelete(DeleteBehavior.Cascade);

        var audit = modelBuilder.Entity<AuditRecord>();
        audit.ToTable("AuditRecords", "audit", table =>
        {
            table.HasCheckConstraint("CK_AuditRecords_OldDataJson", "[OldDataJson] IS NULL OR ISJSON([OldDataJson]) = 1");
            table.HasCheckConstraint("CK_AuditRecords_NewDataJson", "[NewDataJson] IS NULL OR ISJSON([NewDataJson]) = 1");
            table.HasCheckConstraint("CK_AuditRecords_ChangedFieldsJson", "[ChangedFieldsJson] IS NULL OR ISJSON([ChangedFieldsJson]) = 1");
        });
        audit.HasKey(x => x.Id);
        audit.Property(x => x.Id).HasDefaultValueSql(NewGuidSql);
        audit.Property(x => x.TableName).HasMaxLength(128).IsRequired();
        audit.Property(x => x.RecordId).HasMaxLength(80).IsRequired();
        audit.Property(x => x.Operation).HasMaxLength(20).IsRequired();
        audit.Property(x => x.OldDataJson).HasColumnType("nvarchar(max)");
        audit.Property(x => x.NewDataJson).HasColumnType("nvarchar(max)");
        audit.Property(x => x.ChangedFieldsJson).HasColumnType("nvarchar(max)");
        audit.Property(x => x.IpAddress).HasMaxLength(64);
        audit.Property(x => x.CreatedAtUtc).HasDefaultValueSql(UtcNowSql);
        audit.HasIndex(x => new { x.TableName, x.RecordId, x.CreatedAtUtc });
        audit.HasIndex(x => new { x.ActorAccountId, x.CreatedAtUtc });
        audit.HasOne(x => x.ActorAccount).WithMany().HasForeignKey(x => x.ActorAccountId).OnDelete(DeleteBehavior.NoAction);
    }
}
