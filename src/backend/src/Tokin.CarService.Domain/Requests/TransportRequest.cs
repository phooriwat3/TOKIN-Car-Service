using Tokin.CarService.Domain.Common;
using Tokin.CarService.Domain.ReferenceData;

namespace Tokin.CarService.Domain.Requests;

public sealed class TransportRequest : AuditableEntity
{
    public string BookingNumber { get; set; } = string.Empty;
    public Guid? RequesterAccountId { get; set; }
    public UserAccount? RequesterAccount { get; set; }
    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
    public string RequesterEmployeeId { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;
    public string RequesterEmail { get; set; } = string.Empty;
    public string? RequesterPhone { get; set; }
    public string RequesterDepartmentName { get; set; } = string.Empty;
    public TransportRequestStatus Status { get; set; } = TransportRequestStatus.PendingRequesterConfirmation;
    public TransportRequestType RequestType { get; set; }
    public RequestOrigin Origin { get; set; } = RequestOrigin.Employee;
    public RequestCategory Category { get; set; }
    public Guid? ApproverAccountId { get; set; }
    public UserAccount? ApproverAccount { get; set; }
    public string? ApproverName { get; set; }
    public string? ApproverEmail { get; set; }
    public DateOnly UsingDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string PickupLocation { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public int PassengerCount { get; set; }
    public MeetingPoint MeetingPoint { get; set; }
    public bool WithStaff { get; set; }
    public VehiclePreference VehiclePreference { get; set; } = VehiclePreference.Any;
    public bool DriverRequired { get; set; } = true;
    public bool IsUrgent { get; set; }
    public string? UrgentReason { get; set; }
    public bool IsAfterHours { get; set; }
    public string SourceSystem { get; set; } = "transport_portal";
    public string? SourceReference { get; set; }
    public bool SourceConfirmed { get; set; }
    public DateTimeOffset? RequesterConfirmedAtUtc { get; set; }
    public OtVerificationStatus OtVerificationStatus { get; set; } = OtVerificationStatus.NotRequired;
    public OtVerificationMode OtVerificationMode { get; set; } = OtVerificationMode.TigerSpace;
    public DateTimeOffset? OtVerifiedAtUtc { get; set; }
    public Guid? OtVerifiedByAccountId { get; set; }
    public UserAccount? OtVerifiedByAccount { get; set; }
    public string? OtVerificationNote { get; set; }
    public DateTimeOffset? ApprovalDeadlineUtc { get; set; }
    public DateTimeOffset? ApprovalDigestSentAtUtc { get; set; }
    public bool ApprovedAfterDeadline { get; set; }
    public Guid? CreatedByAccountId { get; set; }
    public UserAccount? CreatedByAccount { get; set; }
    public string? CreatedByName { get; set; }
    public string? DecisionReason { get; set; }
    public int RevisionNumber { get; set; } = 1;
    public int WorkflowVersion { get; set; } = 1;
    public DateTimeOffset LastSubmittedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public ICollection<RequestPassenger> Passengers { get; } = new List<RequestPassenger>();
    public ICollection<OvertimeRider> OvertimeRiders { get; } = new List<OvertimeRider>();
    public ICollection<ApprovalRecord> Approvals { get; } = new List<ApprovalRecord>();
    public ICollection<RequestRevision> Revisions { get; } = new List<RequestRevision>();
    public TransportAssignment? Assignment { get; set; }
}

public sealed class RequestPassenger
{
    public Guid Id { get; set; }
    public Guid TransportRequestId { get; set; }
    public TransportRequest TransportRequest { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public int Sequence { get; set; }
}

public sealed class OvertimeRider
{
    public Guid Id { get; set; }
    public Guid TransportRequestId { get; set; }
    public TransportRequest TransportRequest { get; set; } = null!;
    public string EmployeeId { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeEmail { get; set; }
    public string? EmployeePhone { get; set; }
    public string WorkDescription { get; set; } = string.Empty;
    public TimeOnly WorkStart { get; set; }
    public TimeOnly WorkEnd { get; set; }
    public decimal TotalWeeklyHours { get; set; }
    public bool TransportRequired { get; set; } = true;
    public string? BusStop { get; set; }
    public int Sequence { get; set; }
}

public sealed class ApprovalRecord
{
    public Guid Id { get; set; }
    public Guid TransportRequestId { get; set; }
    public TransportRequest TransportRequest { get; set; } = null!;
    public Guid? ApproverAccountId { get; set; }
    public UserAccount? ApproverAccount { get; set; }
    public string ApproverName { get; set; } = string.Empty;
    public string ApproverEmail { get; set; } = string.Empty;
    public ApprovalAction Action { get; set; }
    public string Comments { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public Guid CorrelationId { get; set; }
    public DateTimeOffset ActedAtUtc { get; set; }
}

public sealed class RequestRevision
{
    public Guid Id { get; set; }
    public Guid TransportRequestId { get; set; }
    public TransportRequest TransportRequest { get; set; } = null!;
    public int RevisionNumber { get; set; }
    public TransportRequestStatus Status { get; set; }
    public string SnapshotJson { get; set; } = "{}";
    public string ChangeSource { get; set; } = string.Empty;
    public string? ChangedByEmail { get; set; }
    public string? ChangeReason { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class BookingYearCounter
{
    public int Year { get; set; }
    public long LastSequence { get; set; }
}
