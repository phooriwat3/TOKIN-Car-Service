using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Domain.Requests;
using Tokin.CarService.Domain.Security;
using Tokin.CarService.Domain.Workflow;
using Tokin.CarService.Infrastructure.Persistence;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class SqlServerModelTests
{
    [Fact]
    public void ModelContainsActiveWorkflowTablesAndSecurityControls()
    {
        using var context = CreateContext();
        var model = context.Model;

        Assert.Equal("transport", model.FindEntityType(typeof(TransportRequest))?.GetSchema());
        Assert.Equal("RequestAccessTokens", model.FindEntityType(typeof(RequestAccessToken))?.GetTableName());
        Assert.Equal("PublicRequestAttempts", model.FindEntityType(typeof(PublicRequestAttempt))?.GetTableName());
        Assert.Equal("workflow", model.FindEntityType(typeof(WorkflowOutboxMessage))?.GetSchema());

        var request = model.FindEntityType(typeof(TransportRequest));
        Assert.True(request?.FindProperty(nameof(TransportRequest.RowVersion))?.IsConcurrencyToken);

        var outbox = model.FindEntityType(typeof(WorkflowOutboxMessage));
        Assert.True(outbox?.FindProperty(nameof(WorkflowOutboxMessage.RowVersion))?.IsConcurrencyToken);

        var token = model.FindEntityType(typeof(RequestAccessToken));
        Assert.Contains(token?.GetIndexes() ?? [], index => index.IsUnique);
    }

    [Fact]
    public void ModelGeneratesSqlServerSchemaWithoutConnectingToDatabase()
    {
        using var context = CreateContext();

        var script = context.Database.GenerateCreateScript();

        Assert.Contains("CREATE SCHEMA [transport]", script, StringComparison.Ordinal);
        Assert.Contains("CREATE TABLE [transport].[TransportRequests]", script, StringComparison.Ordinal);
        Assert.Contains("CREATE TABLE [workflow].[OutboxMessages]", script, StringComparison.Ordinal);
        Assert.Contains("CREATE TABLE [security].[RequestAccessTokens]", script, StringComparison.Ordinal);
        Assert.Contains("CREATE TABLE [security].[PublicRequestAttempts]", script, StringComparison.Ordinal);
        Assert.Contains("ISJSON([PayloadJson]) = 1", script, StringComparison.Ordinal);
    }

    private static CarServiceDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<CarServiceDbContext>()
            .UseSqlServer("Server=localhost;Database=TokinModelValidation;User Id=model;Password=not-used;TrustServerCertificate=False")
            .Options;

        return new CarServiceDbContext(options);
    }
}
