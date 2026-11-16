using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Domain.ReferenceData;
using Tokin.CarService.Infrastructure.Persistence;

namespace Tokin.CarService.Api.Ga;

internal sealed class GaGatewayMiddleware(RequestDelegate next, IConfiguration configuration)
{
    public const string ActorKey = "Tokin.GaActorId";

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.CacheControl = "no-store";
        var secret = configuration["GaGateway:SharedSecret"];
        var factory = context.RequestServices.GetService<IDbContextFactory<CarServiceDbContext>>();
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32 || factory is null)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            return;
        }
        var email = context.Request.Headers["x-ga-email"].ToString().Trim().ToLowerInvariant();
        var timestamp = context.Request.Headers["x-ga-timestamp"].ToString();
        var signature = context.Request.Headers["x-ga-signature"].ToString();
        var currentSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (email.Length is < 3 or > 320 || !email.Contains('@')
            || email.Any(char.IsWhiteSpace)
            || !long.TryParse(timestamp, NumberStyles.None, CultureInfo.InvariantCulture, out var seconds)
            || seconds < currentSeconds - 60 || seconds > currentSeconds + 60
            || signature.Length != 64)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        if (context.Request.ContentLength > 64 * 1024)
        {
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            return;
        }
        context.Request.EnableBuffering();
        using var stream = new MemoryStream();
        var buffer = new byte[8192];
        int read;
        while ((read = await context.Request.Body.ReadAsync(buffer, context.RequestAborted)) > 0)
        {
            if (stream.Length + read > 64 * 1024)
            {
                context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                return;
            }
            stream.Write(buffer, 0, read);
        }
        context.Request.Body.Position = 0;
        var bodyHash = Convert.ToHexStringLower(SHA256.HashData(stream.ToArray()));
        var path = context.Request.Path + context.Request.QueryString;
        var canonical = $"{context.Request.Method}\n{path}\n{bodyHash}\n{timestamp}\n{email}";
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(canonical));
        byte[] supplied;
        try { supplied = Convert.FromHexString(signature); }
        catch (FormatException)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }
        if (!CryptographicOperations.FixedTimeEquals(expected, supplied))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        await using var db = await factory.CreateDbContextAsync(context.RequestAborted);
        var actorId = await db.UserAccounts.AsNoTracking()
            .Where(x => x.Email == email && x.IsActive && x.Role == UserRole.Admin)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(context.RequestAborted);
        if (!actorId.HasValue)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
        context.Items[ActorKey] = actorId.Value;
        await next(context);
    }
}
