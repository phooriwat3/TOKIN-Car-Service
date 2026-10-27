using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Api.PublicRequests;

public static partial class PublicRequestEndpoints
{
    public static IEndpointRouteBuilder MapPublicRequestEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        endpoints.MapPost("/api/v1/requests", SubmitAsync)
            .WithName("SubmitPublicTransportRequest")
            .WithMetadata(new RequestSizeLimitAttribute(64 * 1024))
            .RequireRateLimiting("public-request-submit")
            .AllowAnonymous()
            .Produces<SubmitPublicRequestResult>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        return endpoints;
    }

    private static async Task<IResult> SubmitAsync(
        SubmitPublicRequestCommand command,
        HttpContext httpContext,
        IPublicRequestSubmissionService submissionService,
        CancellationToken cancellationToken)
    {
        httpContext.Response.Headers.CacheControl = "no-store";
        var idempotencyKey = httpContext.Request.Headers["Idempotency-Key"].ToString().Trim();
        if (!IsValidIdempotencyKey(idempotencyKey))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>(StringComparer.Ordinal)
            {
                ["Idempotency-Key"] =
                ["Provide a 16 to 200 character Idempotency-Key using letters, numbers, dot, colon, underscore, or hyphen."],
            });
        }

        var fingerprintHash = CreateFingerprintHash(httpContext, command.Requester?.Email);
        try
        {
            var result = await submissionService.SubmitAsync(
                command,
                idempotencyKey,
                fingerprintHash,
                cancellationToken);
            return Results.Created($"/api/v1/requests/{result.RequestId:D}", result);
        }
        catch (PublicRequestValidationException exception)
        {
            return Results.ValidationProblem(exception.Errors);
        }
        catch (PublicRequestConflictException exception)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Request conflict",
                detail: exception.Message);
        }
        catch (PublicRequestRateLimitException exception)
        {
            httpContext.Response.Headers["Retry-After"] = "60";
            return Results.Problem(
                statusCode: StatusCodes.Status429TooManyRequests,
                title: "Too many requests",
                detail: exception.Message);
        }
        catch (PublicRequestServiceUnavailableException exception)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Request service unavailable",
                detail: exception.Message);
        }
    }

    private static bool IsValidIdempotencyKey(string key)
    {
        return key.Length is >= 16 and <= 200 && IdempotencyKeyPattern().IsMatch(key);
    }

    private static string CreateFingerprintHash(HttpContext context, string? email)
    {
        var input = string.Concat(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            "|",
            email?.Trim().ToUpperInvariant() ?? string.Empty,
            "|",
            context.Request.Headers.UserAgent.ToString());
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
    }

    [GeneratedRegex("^[A-Za-z0-9._:-]+$", RegexOptions.CultureInvariant)]
    private static partial Regex IdempotencyKeyPattern();
}
