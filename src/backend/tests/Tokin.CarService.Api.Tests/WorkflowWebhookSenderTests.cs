using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Tokin.CarService.Infrastructure.Workflow;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class WorkflowWebhookSenderTests
{
    [Fact]
    public async Task SendsProviderContractWithSecretAndDeduplicationKey()
    {
        var handler = new RecordingHandler();
        using var client = new HttpClient(handler);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WorkflowDelivery:EndpointUrl"] = "https://notification.example.invalid/trigger",
                ["WorkflowDelivery:SharedSecret"] = "disposable-test-secret",
            })
            .Build();
        var sender = new WebhookNotificationSender(client, configuration);

        var result = await sender.SendAsync(new WorkflowNotification(
            "request-confirmation:sample:1",
            "employee@example.invalid",
            "Confirm request",
            "<p>Test message</p>"), CancellationToken.None);

        Assert.True(result.Delivered);
        Assert.Equal(202, result.HttpStatus);
        Assert.Equal("disposable-test-secret", handler.SharedSecret);
        Assert.Equal("request-confirmation:sample:1", handler.IdempotencyKey);
        using var body = JsonDocument.Parse(handler.Body!);
        Assert.Equal("employee@example.invalid", body.RootElement.GetProperty("recipientEmail").GetString());
        Assert.Equal("Confirm request", body.RootElement.GetProperty("emailSubject").GetString());
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public string? SharedSecret { get; private set; }
        public string? IdempotencyKey { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            SharedSecret = request.Headers.GetValues("x-workflow-secret").Single();
            IdempotencyKey = request.Headers.GetValues("Idempotency-Key").Single();
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.Accepted);
        }
    }
}
