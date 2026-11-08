using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Tokin.CarService.Api.Health;
using Tokin.CarService.Api.PublicRequests;
using Tokin.CarService.Api.ReferenceData;
using Tokin.CarService.Application;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Infrastructure;
using Tokin.CarService.Infrastructure.ReferenceData;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile(
    "appsettings.Local.json",
    optional: true,
    reloadOnChange: false);

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, requireProtectedKeyRing: !builder.Environment.IsDevelopment());
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
    options.AddPolicy("public-reference-read", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
});

var app = builder.Build();

if (app.Environment.IsDevelopment()
    && app.Configuration.GetValue<bool>("DevelopmentData:SeedReferenceData"))
{
    await app.Services.SeedDevelopmentReferenceDataAsync();
}

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
app.MapPublicReferenceDataEndpoints();

app.Run();

public partial class Program;
