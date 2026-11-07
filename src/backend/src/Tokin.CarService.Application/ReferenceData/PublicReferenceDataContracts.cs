namespace Tokin.CarService.Application.ReferenceData;

public sealed record PublicDepartmentOption(string Code, string Name);

public sealed record PublicApproverOption(string Reference, string DisplayName);

public sealed record PublicDepartmentApprovers(
    PublicDepartmentOption Department,
    IReadOnlyList<PublicApproverOption> Approvers);

public interface IPublicReferenceDataService
{
    Task<IReadOnlyList<PublicDepartmentOption>> GetDepartmentsAsync(
        CancellationToken cancellationToken);

    Task<PublicDepartmentApprovers?> GetDepartmentApproversAsync(
        string departmentCode,
        CancellationToken cancellationToken);
}

public sealed class PublicReferenceDataServiceUnavailableException : Exception
{
    public PublicReferenceDataServiceUnavailableException()
        : base("Reference data is not configured.")
    {
    }
}
