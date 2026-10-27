using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Infrastructure;
using Tokin.CarService.Infrastructure.Persistence;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class PublicRequestSqlServerTests
{
    [Fact]
    public async Task SubmissionIsAtomicSecureAndIdempotentWhenSqlServerIsAvailable()
    {
        if (!string.Equals(
                Environment.GetEnvironmentVariable("TOKIN_RUN_SQLSERVER_INTEGRATION"),
                "1",
                StringComparison.Ordinal))
        {
            return;
        }

        var connectionString = Environment.GetEnvironmentVariable("TOKIN_TEST_SQLSERVER_CONNECTION");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "TOKIN_TEST_SQLSERVER_CONNECTION is required when SQL Server integration tests are enabled.");
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:PrimaryDatabase"] = connectionString,
            })
            .Build();
        var services = new ServiceCollection();
        services.AddInfrastructure(configuration);
        services.Configure<PublicRequestOptions>(configuration.GetSection(PublicRequestOptions.SectionName));
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(
            new FixedTimeProvider(DateTimeOffset.Parse(
                "2026-10-27T03:00:00Z",
                System.Globalization.CultureInfo.InvariantCulture)));

        await using var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<IDbContextFactory<CarServiceDbContext>>();
        await using (var setup = await factory.CreateDbContextAsync())
        {
            await setup.Database.MigrateAsync();
            await SeedReferenceDataAsync(setup);
        }

        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IPublicRequestSubmissionService>();
        const string key = "sql-integration-00000001";
        const string fingerprint = "a11ce00000000000000000000000000000000000000000000000000000000000";

        var first = await service.SubmitAsync(
            PublicRequestValidatorTests.CreateValidCommand(),
            key,
            fingerprint,
            CancellationToken.None);
        var replay = await service.SubmitAsync(
            PublicRequestValidatorTests.CreateValidCommand(),
            key,
            fingerprint,
            CancellationToken.None);

        Assert.Equal(first, replay);
        Assert.Equal("CSR-2026-000001", first.RequestNo);

        await using var verification = await factory.CreateDbContextAsync();
        Assert.Equal(1, await verification.TransportRequests.CountAsync());
        Assert.Equal(2, await verification.RequestPassengers.CountAsync());
        Assert.Equal(1, await verification.RequestRevisions.CountAsync());
        Assert.Equal(1, await verification.RequestAccessTokens.CountAsync());
        Assert.Equal(1, await verification.WorkflowOutbox.CountAsync());
        Assert.Equal(1, await verification.ApiIdempotencyRecords.CountAsync());
        Assert.Equal(1, await verification.PublicRequestAttempts.CountAsync());

        var token = await verification.RequestAccessTokens.SingleAsync();
        var outbox = await verification.WorkflowOutbox.SingleAsync();
        using var payload = JsonDocument.Parse(outbox.PayloadJson);
        var protectedToken = payload.RootElement.GetProperty("protectedToken").GetString();
        Assert.Matches("^[0-9a-f]{64}$", token.TokenHash);
        Assert.False(string.IsNullOrWhiteSpace(protectedToken));
        Assert.NotEqual(token.TokenHash, protectedToken);

        var changed = PublicRequestValidatorTests.CreateValidCommand() with
        {
            Destination = "Different destination",
        };
        await Assert.ThrowsAsync<PublicRequestConflictException>(
            () => service.SubmitAsync(changed, key, fingerprint, CancellationToken.None));
        Assert.Equal(1, await verification.TransportRequests.CountAsync());
    }

    private static async Task SeedReferenceDataAsync(CarServiceDbContext context)
    {
        if (await context.Departments.AnyAsync())
        {
            return;
        }

        var timestamp = DateTimeOffset.Parse(
            "2026-10-27T03:00:00Z",
            System.Globalization.CultureInfo.InvariantCulture);
        var department = new Department
        {
            Id = Guid.Parse("019a2aa0-0000-7000-8000-000000000001"),
            Code = "GA",
            Name = "General Affairs",
            IsActive = true,
            CreatedAtUtc = timestamp,
            UpdatedAtUtc = timestamp,
        };
        var approver = new UserAccount
        {
            Id = Guid.Parse("019a2aa0-0000-7000-8000-000000000002"),
            EmployeeId = "7654321",
            FullName = "Test Approver",
            Email = "approver@yageo.com",
            DepartmentId = department.Id,
            Role = UserRole.Approver,
            IsActive = true,
            CreatedAtUtc = timestamp,
            UpdatedAtUtc = timestamp,
        };
        context.Departments.Add(department);
        context.UserAccounts.Add(approver);
        context.DepartmentApprovers.Add(new DepartmentApprover
        {
            DepartmentId = department.Id,
            UserAccountId = approver.Id,
            IsActive = true,
            CreatedAtUtc = timestamp,
            UpdatedAtUtc = timestamp,
        });
        await context.SaveChangesAsync();
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
