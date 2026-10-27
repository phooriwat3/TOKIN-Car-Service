using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tokin.CarService.Application.PublicRequests;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class PublicRequestEndpointTests
{
    [Fact]
    public async Task ValidRequestReturnsCreatedWithoutExposingActionToken()
    {
        var expected = new SubmitPublicRequestResult(
            Guid.Parse("019a2a9f-b241-7000-8000-000000000001"),
            "CSR-2026-000001",
            "pending_requester_confirmation",
            DateTimeOffset.Parse("2026-10-27T03:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
        using var factory = new RequestApiFactory(new StubSubmissionService(expected));
        using var client = factory.CreateClient();
        using var message = CreateRequest();

        using var response = await client.SendAsync(message);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Contains("CSR-2026-000001", body, StringComparison.Ordinal);
        Assert.DoesNotContain("token", body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task MissingIdempotencyKeyReturnsValidationProblem()
    {
        using var factory = new RequestApiFactory(new StubSubmissionService(
            new SubmitPublicRequestResult(Guid.NewGuid(), "unused", "unused", DateTimeOffset.UtcNow)));
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/v1/requests",
            PublicRequestValidatorTests.CreateValidCommand());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ReusedKeyWithDifferentPayloadReturnsConflict()
    {
        using var factory = new RequestApiFactory(new ConflictSubmissionService());
        using var client = factory.CreateClient();
        using var message = CreateRequest();

        using var response = await client.SendAsync(message);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    private static HttpRequestMessage CreateRequest()
    {
        var message = new HttpRequestMessage(HttpMethod.Post, "/api/v1/requests")
        {
            Content = JsonContent.Create(PublicRequestValidatorTests.CreateValidCommand()),
        };
        message.Headers.Add("Idempotency-Key", "test-request-00000001");
        return message;
    }

    private sealed class RequestApiFactory(IPublicRequestSubmissionService service)
        : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IPublicRequestSubmissionService>();
                services.AddSingleton(service);
            });
        }
    }

    private sealed class StubSubmissionService(SubmitPublicRequestResult result)
        : IPublicRequestSubmissionService
    {
        public Task<SubmitPublicRequestResult> SubmitAsync(
            SubmitPublicRequestCommand command,
            string idempotencyKey,
            string fingerprintHash,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(result);
        }
    }

    private sealed class ConflictSubmissionService : IPublicRequestSubmissionService
    {
        public Task<SubmitPublicRequestResult> SubmitAsync(
            SubmitPublicRequestCommand command,
            string idempotencyKey,
            string fingerprintHash,
            CancellationToken cancellationToken)
        {
            throw new PublicRequestConflictException("The key has already been used.");
        }
    }
}
