namespace Tokin.CarService.Api.Health;

public sealed record HealthResponse(
    string Status,
    string Service,
    DateTimeOffset TimestampUtc,
    IReadOnlyDictionary<string, string> Checks)
{
    public static HealthResponse Create() => new(
        Status: "healthy",
        Service: "tokin-car-service-api",
        TimestampUtc: DateTimeOffset.UtcNow,
        Checks: new Dictionary<string, string>
        {
            ["api"] = "up",
            ["database"] = "not_configured",
        });
}
