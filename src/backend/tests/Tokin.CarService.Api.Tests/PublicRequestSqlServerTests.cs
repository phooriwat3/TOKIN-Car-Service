using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Application.ReferenceData;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Domain.Workflow;
using Tokin.CarService.Infrastructure;
using Tokin.CarService.Infrastructure.Persistence;
using Tokin.CarService.Infrastructure.ReferenceData;
using Tokin.CarService.Infrastructure.Workflow;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class PublicRequestSqlServerTests
{
    private static readonly (string Action, string Reason, string Status)[] OtherDecisions =
    [
        ("reject", "Trip is not authorized.", "Rejected"),
        ("request_changes", "Please correct the destination.", "ChangesRequested"),
    ];

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
        var clock = new FixedTimeProvider(DateTimeOffset.Parse(
                "2026-10-27T03:00:00Z",
                System.Globalization.CultureInfo.InvariantCulture));
        services.AddSingleton<TimeProvider>(clock);

        await using var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<IDbContextFactory<CarServiceDbContext>>();
        await using (var setup = await factory.CreateDbContextAsync())
        {
            await setup.Database.MigrateAsync();
            await SeedReferenceDataAsync(setup);
        }
        await provider.SeedDevelopmentReferenceDataAsync();
        await provider.SeedDevelopmentReferenceDataAsync();

        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IPublicRequestSubmissionService>();
        var referenceDataService = scope.ServiceProvider.GetRequiredService<IPublicReferenceDataService>();
        var selectedApprover = (await referenceDataService.GetDepartmentApproversAsync("GA", CancellationToken.None))!
            .Approvers.Single(x => x.DisplayName == "Test Approver");
        var command = PublicRequestValidatorTests.CreateValidCommand() with
        {
            Approver = new PublicApproverInput(null, null, selectedApprover.Reference),
        };
        const string key = "sql-integration-00000001";
        const string fingerprint = "a11ce00000000000000000000000000000000000000000000000000000000000";

        var first = await service.SubmitAsync(
            command,
            key,
            fingerprint,
            CancellationToken.None);
        var replay = await service.SubmitAsync(
            command,
            key,
            fingerprint,
            CancellationToken.None);

        Assert.Equal(first, replay);
        Assert.Equal("CSR-2026-000001", first.RequestNo);

        var tampered = command with
        {
            Approver = command.Approver! with { Reference = selectedApprover.Reference + "invalid" },
        };
        var badReference = await Assert.ThrowsAsync<PublicRequestValidationException>(
            () => service.SubmitAsync(tampered, "sql-integration-bad-ref-0001", fingerprint, CancellationToken.None));
        Assert.Contains("approver.reference", badReference.Errors.Keys);

        var departments = await referenceDataService.GetDepartmentsAsync(CancellationToken.None);
        var departmentApprovers = await referenceDataService.GetDepartmentApproversAsync(
            "ga",
            CancellationToken.None);
        Assert.Contains(departments, x => x.Code == "GA" && x.Name == "General Affairs");
        Assert.Equal(3, departments.Count);
        Assert.NotNull(departmentApprovers);
        Assert.Contains(
            departmentApprovers.Approvers,
            x => x.DisplayName == "Test Approver"
                && !string.IsNullOrWhiteSpace(x.Reference)
                && !Guid.TryParse(x.Reference, out _));

        await using var verification = await factory.CreateDbContextAsync();
        Assert.Equal(1, await verification.TransportRequests.CountAsync());
        Assert.Equal(2, await verification.RequestPassengers.CountAsync());
        Assert.Equal(1, await verification.RequestRevisions.CountAsync());
        Assert.Equal(1, await verification.RequestAccessTokens.CountAsync());
        Assert.Equal(1, await verification.WorkflowOutbox.CountAsync());
        Assert.Equal(1, await verification.ApiIdempotencyRecords.CountAsync());
        Assert.Equal(1, await verification.PublicRequestAttempts.CountAsync());
        Assert.Equal(
            3,
            await verification.UserAccounts.CountAsync(
                x => x.Email.EndsWith("@example.invalid")));

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

        var notificationSender = new RecordingNotificationSender { FailuresRemaining = 1 };
        var deliveryConfiguration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WorkflowDelivery:AppBaseUrl"] = "https://transport.example.invalid/",
                ["WorkflowDelivery:GaNotificationEmail"] = "ga@example.invalid",
            })
            .Build();
        var processor = new WorkflowOutboxProcessor(
            factory,
            provider.GetRequiredService<IDataProtectionProvider>(),
            notificationSender,
            deliveryConfiguration,
            scope.ServiceProvider.GetRequiredService<TimeProvider>());
        Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
        Assert.Equal(OutboxStatus.Failed,
            (await verification.WorkflowOutbox.AsNoTracking().SingleAsync()).Status);
        clock.Advance(TimeSpan.FromMinutes(3));
        Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
        var confirmationEmail = notificationSender.Sent[1];
        Assert.Equal("phooriwat.pungpech@yageo.com", confirmationEmail.RecipientEmail);
        var match = Regex.Match(confirmationEmail.EmailBodyHtml, "token=([A-Za-z0-9_-]+)");
        Assert.True(match.Success);
        var confirmationService = scope.ServiceProvider.GetRequiredService<IPublicRequestConfirmationService>();
        var confirmed = await confirmationService.ConfirmAsync(match.Groups[1].Value, CancellationToken.None);
        Assert.Equal(first.RequestNo, confirmed?.RequestNo);
        Assert.Equal("PendingApproval", confirmed?.Status);
        Assert.Null(await confirmationService.ConfirmAsync(match.Groups[1].Value, CancellationToken.None));
        Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
        Assert.Equal(3, notificationSender.Sent.Count);
        Assert.Equal("approver@yageo.com", notificationSender.Sent[2].RecipientEmail);
        Assert.Equal(2, await verification.WorkflowOutbox.CountAsync());
        Assert.Equal(3, await verification.WorkflowDeliveries.CountAsync());
        Assert.Equal(2, await verification.RequestRevisions.CountAsync());

        var approvalService = scope.ServiceProvider.GetRequiredService<IPublicApprovalService>();
        await DecideAndVerifyAsync(
            notificationSender.Sent[2], "approve", "", "Approved", first.RequestNo);

        foreach (var scenario in OtherDecisions)
        {
            var next = await service.SubmitAsync(
                command with { Destination = scenario.Status + " destination" },
                "sql-integration-" + scenario.Action + "-0001",
                fingerprint,
                CancellationToken.None);
            Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
            var nextConfirmation = Regex.Match(notificationSender.Sent[^1].EmailBodyHtml, "token=([A-Za-z0-9_-]+)");
            Assert.True(nextConfirmation.Success);
            Assert.NotNull(await confirmationService.ConfirmAsync(nextConfirmation.Groups[1].Value, CancellationToken.None));
            Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
            var notices = await DecideAndVerifyAsync(
                notificationSender.Sent[^1], scenario.Action, scenario.Reason, scenario.Status, next.RequestNo);
            if (scenario.Action == "request_changes")
            {
                var requesterNotice = Assert.Single(notices, x => x.RecipientEmail == "phooriwat.pungpech@yageo.com");
                var manageLink = Regex.Match(requesterNotice.EmailBodyHtml, "token=([A-Za-z0-9_-]+)");
                Assert.True(manageLink.Success);
                var manageToken = manageLink.Groups[1].Value;
                var changeService = scope.ServiceProvider.GetRequiredService<IPublicRequestChangeService>();
                var editable = await changeService.ReadAsync(manageToken, CancellationToken.None);
                Assert.Equal(next.RequestNo, editable?.RequestNo);
                Assert.Equal(scenario.Reason, editable?.Reason);
                var correctedCommand = new PublicRequestChangeCommand(
                    manageToken, editable!.UsingDate, editable.StartTime, editable.EndTime,
                    editable.PickupLocation, "Corrected destination", editable.Purpose,
                    editable.MeetingPoint, editable.WithStaff, editable.ImmediateReason,
                    ["Updated passenger"]);
                await Assert.ThrowsAsync<PublicRequestValidationException>(() =>
                    changeService.ResubmitAsync(correctedCommand with { UsingDate = "2000-01-01" }, CancellationToken.None));
                Assert.NotNull(await changeService.ReadAsync(manageToken, CancellationToken.None));
                var resubmitted = await changeService.ResubmitAsync(correctedCommand, CancellationToken.None);
                Assert.Equal("PendingApproval", resubmitted?.Status);
                Assert.Equal("Updated passenger", (await verification.RequestPassengers.AsNoTracking()
                    .SingleAsync(x => x.TransportRequestId == next.RequestId)).Name);
                Assert.Null(await changeService.ReadAsync(manageToken, CancellationToken.None));
                Assert.Null(await changeService.ResubmitAsync(correctedCommand, CancellationToken.None));
                Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
                Assert.Equal("approver@yageo.com", notificationSender.Sent[^1].RecipientEmail);
                var newApprovalLink = Regex.Match(notificationSender.Sent[^1].EmailBodyHtml, "token=([A-Za-z0-9_-]+)");
                Assert.True(newApprovalLink.Success);
                Assert.Equal("Corrected destination", (await approvalService.ReadAsync(
                    newApprovalLink.Groups[1].Value, CancellationToken.None))?.Destination);
            }
        }

        Assert.Equal(3, await verification.ApprovalRecords.CountAsync());
        Assert.Equal(14, await verification.WorkflowDeliveries.CountAsync());

        await service.SubmitAsync(
            command with { Destination = "Inactive approver destination" },
            "sql-integration-inactive-0001", fingerprint, CancellationToken.None);
        Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
        var finalConfirmation = Regex.Match(notificationSender.Sent[^1].EmailBodyHtml, "token=([A-Za-z0-9_-]+)");
        Assert.True(finalConfirmation.Success);
        Assert.NotNull(await confirmationService.ConfirmAsync(finalConfirmation.Groups[1].Value, CancellationToken.None));
        Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
        var finalApproval = Regex.Match(notificationSender.Sent[^1].EmailBodyHtml, "token=([A-Za-z0-9_-]+)");
        Assert.True(finalApproval.Success);
        var approverId = Guid.Parse("019a2aa0-0000-7000-8000-000000000002");
        await verification.DepartmentApprovers
            .Where(x => x.UserAccountId == approverId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.IsActive, false));
        Assert.Null(await approvalService.ReadAsync(finalApproval.Groups[1].Value, CancellationToken.None));
        Assert.Null(await approvalService.DecideAsync(
            new PublicApprovalActionCommand(finalApproval.Groups[1].Value, "approve", ""),
            CancellationToken.None));
        await verification.DepartmentApprovers
            .Where(x => x.UserAccountId == approverId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.IsActive, true));
        clock.Advance(TimeSpan.FromHours(73));
        Assert.Null(await approvalService.ReadAsync(finalApproval.Groups[1].Value, CancellationToken.None));

        async Task<WorkflowNotification[]> DecideAndVerifyAsync(
            WorkflowNotification notification,
            string action,
            string reason,
            string expectedStatus,
            string expectedNumber)
        {
            var link = Regex.Match(notification.EmailBodyHtml, "token=([A-Za-z0-9_-]+)");
            Assert.True(link.Success);
            var approvalToken = link.Groups[1].Value;
            var preview = await approvalService.ReadAsync(approvalToken, CancellationToken.None);
            Assert.Equal(expectedNumber, preview?.RequestNo);
            var decision = await approvalService.DecideAsync(
                new PublicApprovalActionCommand(approvalToken, action, reason), CancellationToken.None);
            Assert.Equal(expectedStatus, decision?.Status);
            Assert.Null(await approvalService.ReadAsync(approvalToken, CancellationToken.None));
            Assert.Null(await approvalService.DecideAsync(
                new PublicApprovalActionCommand(approvalToken, action, reason), CancellationToken.None));
            var sentBefore = notificationSender.Sent.Count;
            Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
            Assert.True(await processor.ProcessOneAsync(CancellationToken.None));
            var notices = notificationSender.Sent.Skip(sentBefore).ToArray();
            var recipients = notices.Select(x => x.RecipientEmail).ToArray();
            Assert.Contains("phooriwat.pungpech@yageo.com", recipients);
            Assert.Contains("ga@example.invalid", recipients);
            return notices;
        }
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
        private DateTimeOffset _utcNow = utcNow;
        public override DateTimeOffset GetUtcNow() => _utcNow;
        public void Advance(TimeSpan duration) => _utcNow = _utcNow.Add(duration);
    }

    private sealed class RecordingNotificationSender : IWorkflowNotificationSender
    {
        public List<WorkflowNotification> Sent { get; } = [];
        public int FailuresRemaining { get; set; }

        public Task<WorkflowDeliveryResult> SendAsync(
            WorkflowNotification notification,
            CancellationToken cancellationToken)
        {
            Sent.Add(notification);
            if (FailuresRemaining > 0)
            {
                FailuresRemaining--;
                return Task.FromResult(new WorkflowDeliveryResult(false, 503, "Notification provider rejected the request."));
            }
            return Task.FromResult(new WorkflowDeliveryResult(true, 200, null));
        }
    }
}
