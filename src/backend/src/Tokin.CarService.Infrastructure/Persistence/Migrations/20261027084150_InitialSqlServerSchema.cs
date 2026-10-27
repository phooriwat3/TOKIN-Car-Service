using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tokin.CarService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialSqlServerSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "security");

            migrationBuilder.EnsureSchema(
                name: "transport");

            migrationBuilder.EnsureSchema(
                name: "audit");

            migrationBuilder.EnsureSchema(
                name: "workflow");

            migrationBuilder.EnsureSchema(
                name: "core");

            migrationBuilder.CreateTable(
                name: "ApiIdempotencyRecords",
                schema: "security",
                columns: table => new
                {
                    IdempotencyKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Endpoint = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RequestHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    StatusCode = table.Column<int>(type: "int", nullable: false),
                    ResponseJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiIdempotencyRecords", x => x.IdempotencyKey);
                    table.CheckConstraint("CK_ApiIdempotencyRecords_ResponseJson", "[ResponseJson] IS NULL OR ISJSON([ResponseJson]) = 1");
                });

            migrationBuilder.CreateTable(
                name: "BookingYearCounters",
                schema: "transport",
                columns: table => new
                {
                    Year = table.Column<int>(type: "int", nullable: false),
                    LastSequence = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingYearCounters", x => x.Year);
                    table.CheckConstraint("CK_BookingYearCounters_Sequence", "[LastSequence] >= 0");
                    table.CheckConstraint("CK_BookingYearCounters_Year", "[Year] BETWEEN 2020 AND 9999");
                });

            migrationBuilder.CreateTable(
                name: "Departments",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    Code = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeDirectory",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    EmployeeId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    DepartmentName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    JobTitle = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeDirectory", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserAccounts",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    EmployeeId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Role = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAccounts_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalSchema: "core",
                        principalTable: "Departments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AuditRecords",
                schema: "audit",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TableName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RecordId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Operation = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ActorAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OldDataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewDataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChangedFieldsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    CorrelationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditRecords", x => x.Id);
                    table.CheckConstraint("CK_AuditRecords_ChangedFieldsJson", "[ChangedFieldsJson] IS NULL OR ISJSON([ChangedFieldsJson]) = 1");
                    table.CheckConstraint("CK_AuditRecords_NewDataJson", "[NewDataJson] IS NULL OR ISJSON([NewDataJson]) = 1");
                    table.CheckConstraint("CK_AuditRecords_OldDataJson", "[OldDataJson] IS NULL OR ISJSON([OldDataJson]) = 1");
                    table.ForeignKey(
                        name: "FK_AuditRecords_UserAccounts_ActorAccountId",
                        column: x => x.ActorAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DepartmentApprovers",
                schema: "core",
                columns: table => new
                {
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentApprovers", x => new { x.DepartmentId, x.UserAccountId });
                    table.ForeignKey(
                        name: "FK_DepartmentApprovers_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalSchema: "core",
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentApprovers_UserAccounts_UserAccountId",
                        column: x => x.UserAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TransportRequests",
                schema: "transport",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    BookingNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    RequesterAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequesterEmployeeId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RequesterName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    RequesterEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    RequesterPhone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    RequesterDepartmentName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RequestType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Origin = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ApproverAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApproverName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    ApproverEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                    UsingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time", nullable: false),
                    PickupLocation = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Destination = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    PassengerCount = table.Column<int>(type: "int", nullable: false),
                    MeetingPoint = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    WithStaff = table.Column<bool>(type: "bit", nullable: false),
                    VehiclePreference = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    DriverRequired = table.Column<bool>(type: "bit", nullable: false),
                    IsUrgent = table.Column<bool>(type: "bit", nullable: false),
                    UrgentReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsAfterHours = table.Column<bool>(type: "bit", nullable: false),
                    SourceSystem = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SourceReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    RequesterConfirmedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    OtVerificationStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    OtVerificationMode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    OtVerifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    OtVerifiedByAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OtVerificationNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ApprovalDeadlineUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ApprovalDigestSentAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ApprovedAfterDeadline = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    DecisionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RevisionNumber = table.Column<int>(type: "int", nullable: false),
                    WorkflowVersion = table.Column<int>(type: "int", nullable: false),
                    LastSubmittedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportRequests", x => x.Id);
                    table.CheckConstraint("CK_TransportRequests_PassengerCount", "[PassengerCount] BETWEEN 1 AND 100");
                    table.CheckConstraint("CK_TransportRequests_Revisions", "[RevisionNumber] > 0 AND [WorkflowVersion] > 0");
                    table.CheckConstraint("CK_TransportRequests_Time", "[EndTime] > [StartTime]");
                    table.CheckConstraint("CK_TransportRequests_UrgentReason", "[IsUrgent] = 0 OR LEN(LTRIM(RTRIM(ISNULL([UrgentReason], '')))) > 0");
                    table.ForeignKey(
                        name: "FK_TransportRequests_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalSchema: "core",
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TransportRequests_UserAccounts_ApproverAccountId",
                        column: x => x.ApproverAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TransportRequests_UserAccounts_CreatedByAccountId",
                        column: x => x.CreatedByAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TransportRequests_UserAccounts_OtVerifiedByAccountId",
                        column: x => x.OtVerifiedByAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TransportRequests_UserAccounts_RequesterAccountId",
                        column: x => x.RequesterAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ApprovalRecords",
                schema: "transport",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApproverAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApproverName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    ApproverEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Comments = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CorrelationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApprovalRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApprovalRecords_TransportRequests_TransportRequestId",
                        column: x => x.TransportRequestId,
                        principalSchema: "transport",
                        principalTable: "TransportRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApprovalRecords_UserAccounts_ApproverAccountId",
                        column: x => x.ApproverAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false),
                    DeduplicationKey = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    MaxAttempts = table.Column<int>(type: "int", nullable: false),
                    AvailableAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    LockedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeliveredAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CorrelationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                    table.CheckConstraint("CK_OutboxMessages_Attempts", "[AttemptCount] >= 0 AND [MaxAttempts] BETWEEN 1 AND 1000");
                    table.CheckConstraint("CK_OutboxMessages_PayloadJson", "ISJSON([PayloadJson]) = 1");
                    table.CheckConstraint("CK_OutboxMessages_SchemaVersion", "[SchemaVersion] = 1");
                    table.ForeignKey(
                        name: "FK_OutboxMessages_TransportRequests_TransportRequestId",
                        column: x => x.TransportRequestId,
                        principalSchema: "transport",
                        principalTable: "TransportRequests",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OvertimeRiders",
                schema: "transport",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    EmployeeName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    EmployeeEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                    EmployeePhone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    WorkDescription = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    WorkStart = table.Column<TimeOnly>(type: "time", nullable: false),
                    WorkEnd = table.Column<TimeOnly>(type: "time", nullable: false),
                    TotalWeeklyHours = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    TransportRequired = table.Column<bool>(type: "bit", nullable: false),
                    BusStop = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Sequence = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OvertimeRiders", x => x.Id);
                    table.CheckConstraint("CK_OvertimeRiders_BusStop", "[TransportRequired] = 0 OR LEN(LTRIM(RTRIM(ISNULL([BusStop], '')))) > 0");
                    table.CheckConstraint("CK_OvertimeRiders_Hours", "[TotalWeeklyHours] BETWEEN 0 AND 168");
                    table.CheckConstraint("CK_OvertimeRiders_Time", "[WorkEnd] > [WorkStart]");
                    table.ForeignKey(
                        name: "FK_OvertimeRiders_TransportRequests_TransportRequestId",
                        column: x => x.TransportRequestId,
                        principalSchema: "transport",
                        principalTable: "TransportRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RequestAccessTokens",
                schema: "security",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TokenType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    TokenHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    RevisionNumber = table.Column<int>(type: "int", nullable: false),
                    SubjectEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UsedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RevokedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastAccessedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RequestAccessTokens", x => x.Id);
                    table.CheckConstraint("CK_RequestAccessTokens_Expiry", "[ExpiresAtUtc] > [CreatedAtUtc]");
                    table.CheckConstraint("CK_RequestAccessTokens_Hash", "LEN([TokenHash]) = 64 AND [TokenHash] NOT LIKE '%[^0-9a-f]%'");
                    table.ForeignKey(
                        name: "FK_RequestAccessTokens_TransportRequests_TransportRequestId",
                        column: x => x.TransportRequestId,
                        principalSchema: "transport",
                        principalTable: "TransportRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RequestPassengers",
                schema: "transport",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RequestPassengers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RequestPassengers_TransportRequests_TransportRequestId",
                        column: x => x.TransportRequestId,
                        principalSchema: "transport",
                        principalTable: "TransportRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RequestRevisions",
                schema: "transport",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RevisionNumber = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    SnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChangeSource = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ChangedByEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                    ChangeReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RequestRevisions", x => x.Id);
                    table.CheckConstraint("CK_RequestRevisions_SnapshotJson", "ISJSON([SnapshotJson]) = 1");
                    table.ForeignKey(
                        name: "FK_RequestRevisions_TransportRequests_TransportRequestId",
                        column: x => x.TransportRequestId,
                        principalSchema: "transport",
                        principalTable: "TransportRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransportAssignments",
                schema: "transport",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedByAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AssignedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransportAssignments_TransportRequests_TransportRequestId",
                        column: x => x.TransportRequestId,
                        principalSchema: "transport",
                        principalTable: "TransportRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransportAssignments_UserAccounts_AssignedByAccountId",
                        column: x => x.AssignedByAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DeliveryAttempts",
                schema: "workflow",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    OutboxMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ProviderRunId = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: true),
                    HttpStatus = table.Column<int>(type: "int", nullable: true),
                    SanitizedError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    NextRetryAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryAttempts", x => x.Id);
                    table.CheckConstraint("CK_DeliveryAttempts_HttpStatus", "[HttpStatus] IS NULL OR [HttpStatus] BETWEEN 100 AND 599");
                    table.ForeignKey(
                        name: "FK_DeliveryAttempts_OutboxMessages_OutboxMessageId",
                        column: x => x.OutboxMessageId,
                        principalSchema: "workflow",
                        principalTable: "OutboxMessages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransportUnits",
                schema: "transport",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportAssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UnitCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    LicensePlate = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    VehicleDescription = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    VehicleType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    DriverName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    DriverPhone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ContractorName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    TripRateThb = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    DriverAccepted = table.Column<bool>(type: "bit", nullable: false),
                    DriverAcceptedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')"),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportUnits", x => x.Id);
                    table.CheckConstraint("CK_TransportUnits_TripRate", "[TripRateThb] IS NULL OR [TripRateThb] >= 0");
                    table.ForeignKey(
                        name: "FK_TransportUnits_TransportAssignments_TransportAssignmentId",
                        column: x => x.TransportAssignmentId,
                        principalSchema: "transport",
                        principalTable: "TransportAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DriverDispatchEvents",
                schema: "transport",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    TransportRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TransportUnitId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ActorAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ActorEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriverDispatchEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DriverDispatchEvents_TransportRequests_TransportRequestId",
                        column: x => x.TransportRequestId,
                        principalSchema: "transport",
                        principalTable: "TransportRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DriverDispatchEvents_TransportUnits_TransportUnitId",
                        column: x => x.TransportUnitId,
                        principalSchema: "transport",
                        principalTable: "TransportUnits",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DriverDispatchEvents_UserAccounts_ActorAccountId",
                        column: x => x.ActorAccountId,
                        principalSchema: "core",
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TransportUnitRiders",
                schema: "transport",
                columns: table => new
                {
                    TransportUnitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OvertimeRiderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportUnitRiders", x => new { x.TransportUnitId, x.OvertimeRiderId });
                    table.ForeignKey(
                        name: "FK_TransportUnitRiders_OvertimeRiders_OvertimeRiderId",
                        column: x => x.OvertimeRiderId,
                        principalSchema: "transport",
                        principalTable: "OvertimeRiders",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TransportUnitRiders_TransportUnits_TransportUnitId",
                        column: x => x.TransportUnitId,
                        principalSchema: "transport",
                        principalTable: "TransportUnits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApiIdempotencyRecords_ExpiresAtUtc",
                schema: "security",
                table: "ApiIdempotencyRecords",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRecords_ApproverAccountId",
                schema: "transport",
                table: "ApprovalRecords",
                column: "ApproverAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRecords_TransportRequestId_ActedAtUtc",
                schema: "transport",
                table: "ApprovalRecords",
                columns: new[] { "TransportRequestId", "ActedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditRecords_ActorAccountId_CreatedAtUtc",
                schema: "audit",
                table: "AuditRecords",
                columns: new[] { "ActorAccountId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditRecords_TableName_RecordId_CreatedAtUtc",
                schema: "audit",
                table: "AuditRecords",
                columns: new[] { "TableName", "RecordId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryAttempts_OutboxMessageId_AttemptNumber_Channel",
                schema: "workflow",
                table: "DeliveryAttempts",
                columns: new[] { "OutboxMessageId", "AttemptNumber", "Channel" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentApprovers_DepartmentId_IsActive",
                schema: "core",
                table: "DepartmentApprovers",
                columns: new[] { "DepartmentId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentApprovers_UserAccountId",
                schema: "core",
                table: "DepartmentApprovers",
                column: "UserAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_Code",
                schema: "core",
                table: "Departments",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Departments_IsActive_Name",
                schema: "core",
                table: "Departments",
                columns: new[] { "IsActive", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_DriverDispatchEvents_ActorAccountId",
                schema: "transport",
                table: "DriverDispatchEvents",
                column: "ActorAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_DriverDispatchEvents_TransportRequestId_CreatedAtUtc",
                schema: "transport",
                table: "DriverDispatchEvents",
                columns: new[] { "TransportRequestId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_DriverDispatchEvents_TransportUnitId",
                schema: "transport",
                table: "DriverDispatchEvents",
                column: "TransportUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeDirectory_Email",
                schema: "core",
                table: "EmployeeDirectory",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeDirectory_EmployeeId",
                schema: "core",
                table: "EmployeeDirectory",
                column: "EmployeeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeDirectory_IsActive_FullName_EmployeeId",
                schema: "core",
                table: "EmployeeDirectory",
                columns: new[] { "IsActive", "FullName", "EmployeeId" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_DeduplicationKey",
                schema: "workflow",
                table: "OutboxMessages",
                column: "DeduplicationKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Status_AvailableAtUtc_CreatedAtUtc",
                schema: "workflow",
                table: "OutboxMessages",
                columns: new[] { "Status", "AvailableAtUtc", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_TransportRequestId_CreatedAtUtc",
                schema: "workflow",
                table: "OutboxMessages",
                columns: new[] { "TransportRequestId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_OvertimeRiders_TransportRequestId_EmployeeId",
                schema: "transport",
                table: "OvertimeRiders",
                columns: new[] { "TransportRequestId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RequestAccessTokens_ExpiresAtUtc",
                schema: "security",
                table: "RequestAccessTokens",
                column: "ExpiresAtUtc",
                filter: "[UsedAtUtc] IS NULL AND [RevokedAtUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RequestAccessTokens_TokenHash",
                schema: "security",
                table: "RequestAccessTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RequestAccessTokens_TransportRequestId_RevisionNumber_CreatedAtUtc",
                schema: "security",
                table: "RequestAccessTokens",
                columns: new[] { "TransportRequestId", "RevisionNumber", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_RequestAccessTokens_TransportRequestId_TokenType",
                schema: "security",
                table: "RequestAccessTokens",
                columns: new[] { "TransportRequestId", "TokenType" },
                unique: true,
                filter: "[UsedAtUtc] IS NULL AND [RevokedAtUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RequestPassengers_TransportRequestId_Sequence",
                schema: "transport",
                table: "RequestPassengers",
                columns: new[] { "TransportRequestId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RequestRevisions_TransportRequestId_RevisionNumber",
                schema: "transport",
                table: "RequestRevisions",
                columns: new[] { "TransportRequestId", "RevisionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransportAssignments_AssignedByAccountId",
                schema: "transport",
                table: "TransportAssignments",
                column: "AssignedByAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportAssignments_TransportRequestId",
                schema: "transport",
                table: "TransportAssignments",
                column: "TransportRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_ApproverAccountId",
                schema: "transport",
                table: "TransportRequests",
                column: "ApproverAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_BookingNumber",
                schema: "transport",
                table: "TransportRequests",
                column: "BookingNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_CreatedByAccountId",
                schema: "transport",
                table: "TransportRequests",
                column: "CreatedByAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_DepartmentId_UsingDate",
                schema: "transport",
                table: "TransportRequests",
                columns: new[] { "DepartmentId", "UsingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_OtVerifiedByAccountId",
                schema: "transport",
                table: "TransportRequests",
                column: "OtVerifiedByAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_RequesterAccountId",
                schema: "transport",
                table: "TransportRequests",
                column: "RequesterAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_RequesterEmployeeId",
                schema: "transport",
                table: "TransportRequests",
                column: "RequesterEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_RequestType_OtVerificationStatus_UsingDate",
                schema: "transport",
                table: "TransportRequests",
                columns: new[] { "RequestType", "OtVerificationStatus", "UsingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_TransportRequests_Status_UsingDate",
                schema: "transport",
                table: "TransportRequests",
                columns: new[] { "Status", "UsingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_TransportUnitRiders_OvertimeRiderId",
                schema: "transport",
                table: "TransportUnitRiders",
                column: "OvertimeRiderId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportUnits_TransportAssignmentId_UnitCode",
                schema: "transport",
                table: "TransportUnits",
                columns: new[] { "TransportAssignmentId", "UnitCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_DepartmentId",
                schema: "core",
                table: "UserAccounts",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_Email",
                schema: "core",
                table: "UserAccounts",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_EmployeeId",
                schema: "core",
                table: "UserAccounts",
                column: "EmployeeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_Role_IsActive",
                schema: "core",
                table: "UserAccounts",
                columns: new[] { "Role", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApiIdempotencyRecords",
                schema: "security");

            migrationBuilder.DropTable(
                name: "ApprovalRecords",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "AuditRecords",
                schema: "audit");

            migrationBuilder.DropTable(
                name: "BookingYearCounters",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "DeliveryAttempts",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "DepartmentApprovers",
                schema: "core");

            migrationBuilder.DropTable(
                name: "DriverDispatchEvents",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "EmployeeDirectory",
                schema: "core");

            migrationBuilder.DropTable(
                name: "RequestAccessTokens",
                schema: "security");

            migrationBuilder.DropTable(
                name: "RequestPassengers",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "RequestRevisions",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "TransportUnitRiders",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "OutboxMessages",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "OvertimeRiders",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "TransportUnits",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "TransportAssignments",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "TransportRequests",
                schema: "transport");

            migrationBuilder.DropTable(
                name: "UserAccounts",
                schema: "core");

            migrationBuilder.DropTable(
                name: "Departments",
                schema: "core");
        }
    }
}
