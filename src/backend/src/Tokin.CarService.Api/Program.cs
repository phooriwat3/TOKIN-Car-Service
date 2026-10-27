using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Tokin.CarService.Api.Health;
using Tokin.CarService.Api.PublicRequests;
using Tokin.CarService.Application;
using Tokin.CarService.Application.PublicRequests;
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
builder.Services.Configure<PublicRequestOptions>(
    builder.Configuration.GetSection(PublicRequestOptions.SectionName));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("public-request-submit", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
});

var app = builder.Build();

app.UseExceptionHandler();
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next(context);
});
app.UseRateLimiter();

app.MapGet("/api/health", () => Results.Ok(HealthResponse.Create()))
    .WithName("GetHealth")
    .AllowAnonymous();
app.MapPublicRequestEndpoints();

app.Run();

public partial class Program;
