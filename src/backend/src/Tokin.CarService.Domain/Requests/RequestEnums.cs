namespace Tokin.CarService.Domain.Requests;

public enum TransportRequestStatus
{
    Unknown = 0,
    Draft,
    PendingRequesterConfirmation,
    PendingApproval,
    PendingOtVerification,
    ChangesRequested,
    Approved,
    Rejected,
    Assigned,
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
}

public enum TransportRequestType
{
    Unknown = 0,
    OutsideCompany,
    Overtime,
}

public enum RequestOrigin
{
    Unknown = 0,
    Employee,
    HrDirect,
}

public enum RequestCategory
{
    Unknown = 0,
    BusinessTrip,
    AfterHours,
    Errand,
    OvertimeTransport,
    VisitorPickup,
}

public enum MeetingPoint
{
    Unknown = 0,
    FrontArea,
    LoadingArea,
}

public enum VehiclePreference
{
    Unknown = 0,
    Any,
    Van,
    Car,
    Pickup,
    Other,
}

public enum OtVerificationStatus
{
    Unknown = 0,
    NotRequired,
    Pending,
    Verified,
    NotFound,
    Rejected,
}

public enum OtVerificationMode
{
    Unknown = 0,
    TigerSpace,
    ManagerException,
}

public enum ApprovalAction
{
    Unknown = 0,
    Approved,
    Rejected,
    ChangesRequested,
}

public enum DriverDispatchAction
{
    Unknown = 0,
    Copied,
    Opened,
    Sent,
    CancellationCopied,
    CancellationOpened,
    CancellationSent,
}
