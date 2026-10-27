using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Domain.Audit;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Domain.Requests;
using Tokin.CarService.Domain.Security;
using Tokin.CarService.Domain.Workflow;

namespace Tokin.CarService.Infrastructure.Persistence;

public sealed class CarServiceDbContext(DbContextOptions<CarServiceDbContext> options)
    : DbContext(options)
{
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<DepartmentApprover> DepartmentApprovers => Set<DepartmentApprover>();
    public DbSet<EmployeeDirectoryEntry> EmployeeDirectory => Set<EmployeeDirectoryEntry>();
    public DbSet<TransportRequest> TransportRequests => Set<TransportRequest>();
    public DbSet<RequestPassenger> RequestPassengers => Set<RequestPassenger>();
    public DbSet<OvertimeRider> OvertimeRiders => Set<OvertimeRider>();
    public DbSet<ApprovalRecord> ApprovalRecords => Set<ApprovalRecord>();
    public DbSet<RequestRevision> RequestRevisions => Set<RequestRevision>();
    public DbSet<BookingYearCounter> BookingYearCounters => Set<BookingYearCounter>();
    public DbSet<TransportAssignment> TransportAssignments => Set<TransportAssignment>();
    public DbSet<TransportUnit> TransportUnits => Set<TransportUnit>();
    public DbSet<TransportUnitRider> TransportUnitRiders => Set<TransportUnitRider>();
    public DbSet<DriverDispatchEvent> DriverDispatchEvents => Set<DriverDispatchEvent>();
    public DbSet<RequestAccessToken> RequestAccessTokens => Set<RequestAccessToken>();
    public DbSet<ApiIdempotencyRecord> ApiIdempotencyRecords => Set<ApiIdempotencyRecord>();
    public DbSet<PublicRequestAttempt> PublicRequestAttempts => Set<PublicRequestAttempt>();
    public DbSet<WorkflowOutboxMessage> WorkflowOutbox => Set<WorkflowOutboxMessage>();
    public DbSet<WorkflowDelivery> WorkflowDeliveries => Set<WorkflowDelivery>();
    public DbSet<AuditRecord> AuditRecords => Set<AuditRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        ModelConfiguration.ConfigureReferenceData(modelBuilder);
        ModelConfiguration.ConfigureRequests(modelBuilder);
        ModelConfiguration.ConfigureAssignments(modelBuilder);
        ModelConfiguration.ConfigureSecurity(modelBuilder);
        ModelConfiguration.ConfigureWorkflowAndAudit(modelBuilder);
    }
}
