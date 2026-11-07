using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Application.ReferenceData;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Infrastructure.Persistence;

namespace Tokin.CarService.Infrastructure.ReferenceData;

internal sealed class PublicReferenceDataService(
    IDbContextFactory<CarServiceDbContext> dbContextFactory,
    IDataProtectionProvider dataProtectionProvider)
    : IPublicReferenceDataService
{
    private readonly IDataProtector _approverReferenceProtector = dataProtectionProvider.CreateProtector(
        "Tokin.CarService",
        "PublicApproverReference",
        "v1");

    public async Task<IReadOnlyList<PublicDepartmentOption>> GetDepartmentsAsync(
        CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        return await dbContext.Departments
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ThenBy(x => x.Code)
            .Select(x => new PublicDepartmentOption(x.Code, x.Name))
            .ToListAsync(cancellationToken);
    }

    public async Task<PublicDepartmentApprovers?> GetDepartmentApproversAsync(
        string departmentCode,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(departmentCode);

        var normalizedCode = departmentCode.Trim().ToUpperInvariant();
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var department = await dbContext.Departments
            .AsNoTracking()
            .Where(x => x.IsActive && x.Code == normalizedCode)
            .Select(x => new { x.Id, x.Code, x.Name })
            .SingleOrDefaultAsync(cancellationToken);
        if (department is null)
        {
            return null;
        }

        var approverAccounts = await dbContext.DepartmentApprovers
            .AsNoTracking()
            .Where(x =>
                x.DepartmentId == department.Id
                && x.IsActive
                && x.UserAccount.IsActive
                && x.UserAccount.Role == UserRole.Approver)
            .OrderBy(x => x.UserAccount.FullName)
            .ThenBy(x => x.UserAccount.Id)
            .Select(x => new { x.UserAccount.Id, x.UserAccount.FullName })
            .ToListAsync(cancellationToken);
        var approvers = approverAccounts
            .Select(x => new PublicApproverOption(
                _approverReferenceProtector.Protect(x.Id.ToString("D")),
                x.FullName))
            .ToList();

        return new PublicDepartmentApprovers(
            new PublicDepartmentOption(department.Code, department.Name),
            approvers);
    }
}
