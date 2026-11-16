using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tokin.CarService.Application.PublicRequests;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class PublicApprovalEndpointTests
{
    [Fact]
    public async Task ApprovalAccessAndActionUseNoStoreAndGenericInvalidLinkResponse()
    {
        using var factory = new ApprovalApiFactory();
        using var client = factory.CreateClient();

        using var access = await client.PostAsJsonAsync(
            "/api/v1/approvals/access", new { token = "valid-test-token" });
        Assert.Equal(HttpStatusCode.OK, access.StatusCode);
        Assert.Equal("no-store", access.Headers.CacheControl?.ToString());

        using var action = await client.PostAsJsonAsync(
            "/api/v1/approvals/action",
            new PublicApprovalActionCommand("valid-test-token", "approve", ""));
        Assert.Equal(HttpStatusCode.OK, action.StatusCode);
        Assert.Equal("no-store", action.Headers.CacheControl?.ToString());

        using var invalid = await client.PostAsJsonAsync(
            "/api/v1/approvals/access", new { token = "invalid" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }

    private sealed class ApprovalApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IPublicApprovalService>();
                services.AddSingleton<IPublicApprovalService, StubApprovalService>();
            });
        }
    }

    private sealed class StubApprovalService : IPublicApprovalService
    {
        public Task<PublicApprovalAccess?> ReadAsync(string? token, CancellationToken cancellationToken) =>
            Task.FromResult<PublicApprovalAccess?>(token == "valid-test-token"
                ? new PublicApprovalAccess("CSR-2026-000001", "Test Employee", "GA", "Test Approver",
                    "2026-10-28", "09:00", "12:00", "TOKIN", "Customer", "Visit", 1, false)
                : null);

        public Task<PublicApprovalActionResult?> DecideAsync(
            PublicApprovalActionCommand command,
            CancellationToken cancellationToken) => Task.FromResult<PublicApprovalActionResult?>(
            command.Token == "valid-test-token"
                ? new PublicApprovalActionResult("CSR-2026-000001", "Approved")
                : null);
    }
}
