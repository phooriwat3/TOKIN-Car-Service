using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tokin.CarService.Application.ReferenceData;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class PublicReferenceDataEndpointTests
{
    [Fact]
    public async Task DepartmentsReturnOnlyPublicOptions()
    {
        using var factory = new ReferenceApiFactory(new StubReferenceDataService());
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/v1/reference/departments");
        var body = await response.Content.ReadAsStringAsync();
        var departments = await response.Content
            .ReadFromJsonAsync<IReadOnlyList<PublicDepartmentOption>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(departments);
        Assert.Equal(2, departments.Count);
        Assert.DoesNotContain("email", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("employee", body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task ApproversReturnOpaqueReferenceAndDisplayNameOnly()
    {
        using var factory = new ReferenceApiFactory(new StubReferenceDataService());
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/v1/reference/departments/ga/approvers");
        var body = await response.Content.ReadAsStringAsync();
        var result = await response.Content.ReadFromJsonAsync<PublicDepartmentApprovers>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);
        Assert.Equal("GA", result.Department.Code);
        Assert.Single(result.Approvers);
        Assert.False(Guid.TryParse(result.Approvers[0].Reference, out _));
        Assert.DoesNotContain("@", body, StringComparison.Ordinal);
        Assert.DoesNotContain("email", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("employee", body, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("not-found", HttpStatusCode.NotFound)]
    [InlineData("bad.code", HttpStatusCode.BadRequest)]
    public async Task InvalidOrMissingDepartmentDoesNotExposeReferenceData(
        string departmentCode,
        HttpStatusCode expectedStatus)
    {
        using var factory = new ReferenceApiFactory(new StubReferenceDataService());
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            $"/api/v1/reference/departments/{departmentCode}/approvers");

        Assert.Equal(expectedStatus, response.StatusCode);
    }

    [Fact]
    public async Task MissingDatabaseConfigurationReturnsServiceUnavailable()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/v1/reference/departments");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    private sealed class ReferenceApiFactory(IPublicReferenceDataService service)
        : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IPublicReferenceDataService>();
                services.AddSingleton(service);
            });
        }
    }

    private sealed class StubReferenceDataService : IPublicReferenceDataService
    {
        private static readonly PublicDepartmentOption[] Departments =
        [
            new("ENG", "Engineering"),
            new("GA", "General Affairs"),
        ];

        public Task<IReadOnlyList<PublicDepartmentOption>> GetDepartmentsAsync(
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<PublicDepartmentOption>>(Departments);
        }

        public Task<PublicDepartmentApprovers?> GetDepartmentApproversAsync(
            string departmentCode,
            CancellationToken cancellationToken)
        {
            PublicDepartmentApprovers? result = departmentCode == "GA"
                ? new PublicDepartmentApprovers(
                    new PublicDepartmentOption("GA", "General Affairs"),
                    [
                        new PublicApproverOption(
                            "protected-development-reference",
                            "Development Approver"),
                    ])
                : null;
            return Task.FromResult(result);
        }
    }
}
