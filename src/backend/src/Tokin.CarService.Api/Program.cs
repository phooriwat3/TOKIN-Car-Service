using Tokin.CarService.Api.Health;
using Tokin.CarService.Application;
using Tokin.CarService.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile(
    "appsettings.Local.json",
    optional: true,
    reloadOnChange: false);

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next(context);
});

app.MapGet("/api/health", () => Results.Ok(HealthResponse.Create()))
    .WithName("GetHealth")
    .AllowAnonymous();

app.Run();

public partial class Program;
