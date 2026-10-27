using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class HealthEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task GetHealthReturnsSafeDataFreeStatus()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/health");
        var body = await response.Content.ReadFromJsonAsync<HealthPayload>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal("healthy", body.Status);
        Assert.Equal("tokin-car-service-api", body.Service);
        Assert.Equal("up", body.Checks["api"]);
        Assert.Equal("not_configured", body.Checks["database"]);
        Assert.True(response.Headers.TryGetValues("X-Content-Type-Options", out var values));
        Assert.Contains("nosniff", values);
    }

    private sealed record HealthPayload(
        string Status,
        string Service,
        DateTimeOffset TimestampUtc,
        Dictionary<string, string> Checks);
}
