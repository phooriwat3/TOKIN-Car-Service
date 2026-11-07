using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Infrastructure.Persistence;

namespace Tokin.CarService.Infrastructure.ReferenceData;

public static class DevelopmentReferenceDataSeeder
{
    public static async Task SeedDevelopmentReferenceDataAsync(
        this IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(services);

        var factory = services.GetRequiredService<IDbContextFactory<CarServiceDbContext>>();
        await using var dbContext = await factory.CreateDbContextAsync(cancellationToken);
        var timestamp = DateTimeOffset.UtcNow;
        var seeds = CreateSeeds();

        foreach (var seed in seeds)
        {
            var department = await dbContext.Departments
                .SingleOrDefaultAsync(x => x.Code == seed.DepartmentCode, cancellationToken);
            if (department is null)
            {
                department = new Department
                {
                    Id = seed.DepartmentId,
                    Code = seed.DepartmentCode,
                    Name = seed.DepartmentName,
                    IsActive = true,
                    CreatedAtUtc = timestamp,
                    UpdatedAtUtc = timestamp,
                };
                dbContext.Departments.Add(department);
            }

            var approver = await dbContext.UserAccounts
                .SingleOrDefaultAsync(x => x.Email == seed.ApproverEmail, cancellationToken);
            if (approver is null)
            {
                approver = new UserAccount
                {
                    Id = seed.ApproverId,
                    EmployeeId = seed.ApproverEmployeeId,
                    FullName = seed.ApproverName,
                    Email = seed.ApproverEmail,
                    Department = department,
                    Role = UserRole.Approver,
                    IsActive = true,
                    CreatedAtUtc = timestamp,
                    UpdatedAtUtc = timestamp,
                };
                dbContext.UserAccounts.Add(approver);
            }

            var mappingExists = await dbContext.DepartmentApprovers.AnyAsync(
                x => x.DepartmentId == department.Id && x.UserAccountId == approver.Id,
                cancellationToken);
            if (!mappingExists)
            {
                dbContext.DepartmentApprovers.Add(new DepartmentApprover
                {
                    Department = department,
                    UserAccount = approver,
                    IsActive = true,
                    CreatedAtUtc = timestamp,
                    UpdatedAtUtc = timestamp,
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static IReadOnlyList<DevelopmentReferenceSeed> CreateSeeds() =>
    [
        new(
            Guid.Parse("019a3bd0-0000-7000-8000-000000000001"),
            "GA",
            "General Affairs (Development)",
            Guid.Parse("019a3bd0-0000-7000-8000-000000000101"),
            "9000001",
            "GA Development Approver",
            "ga.approver@example.invalid"),
        new(
            Guid.Parse("019a3bd0-0000-7000-8000-000000000002"),
            "ENG",
            "Engineering (Development)",
            Guid.Parse("019a3bd0-0000-7000-8000-000000000102"),
            "9000002",
            "Engineering Development Approver",
            "engineering.approver@example.invalid"),
        new(
            Guid.Parse("019a3bd0-0000-7000-8000-000000000003"),
            "QA",
            "Quality Assurance (Development)",
            Guid.Parse("019a3bd0-0000-7000-8000-000000000103"),
            "9000003",
            "QA Development Approver",
            "qa.approver@example.invalid"),
    ];

    private sealed record DevelopmentReferenceSeed(
        Guid DepartmentId,
        string DepartmentCode,
        string DepartmentName,
        Guid ApproverId,
        string ApproverEmployeeId,
        string ApproverName,
        string ApproverEmail);
}
