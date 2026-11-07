using Tokin.CarService.Application.ReferenceData;

namespace Tokin.CarService.Infrastructure.ReferenceData;

internal sealed class UnconfiguredPublicReferenceDataService : IPublicReferenceDataService
{
    public Task<IReadOnlyList<PublicDepartmentOption>> GetDepartmentsAsync(
        CancellationToken cancellationToken)
    {
        throw new PublicReferenceDataServiceUnavailableException();
    }

    public Task<PublicDepartmentApprovers?> GetDepartmentApproversAsync(
        string departmentCode,
        CancellationToken cancellationToken)
    {
        throw new PublicReferenceDataServiceUnavailableException();
    }
}
