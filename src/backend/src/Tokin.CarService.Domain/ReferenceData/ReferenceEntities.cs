using Tokin.CarService.Domain.Common;

namespace Tokin.CarService.Domain.ReferenceData;

public enum UserRole
{
    Unknown = 0,
    Requester,
    Approver,
    Admin,
    Driver,
    Finance,
    Executive,
    Auditor,
}

public sealed class Department : AuditableEntity
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public byte[] RowVersion { get; set; } = [];

    public ICollection<UserAccount> Users { get; } = new List<UserAccount>();

    public ICollection<DepartmentApprover> Approvers { get; } = new List<DepartmentApprover>();
}

public sealed class UserAccount : AuditableEntity
{
    public string EmployeeId { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public Guid? DepartmentId { get; set; }

    public Department? Department { get; set; }

    public UserRole Role { get; set; } = UserRole.Requester;

    public bool IsActive { get; set; } = true;

    public byte[] RowVersion { get; set; } = [];
}

public sealed class DepartmentApprover
{
    public Guid DepartmentId { get; set; }

    public Department Department { get; set; } = null!;

    public Guid UserAccountId { get; set; }

    public UserAccount UserAccount { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class EmployeeDirectoryEntry : AuditableEntity
{
    public string EmployeeId { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public string JobTitle { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public byte[] RowVersion { get; set; } = [];
}
