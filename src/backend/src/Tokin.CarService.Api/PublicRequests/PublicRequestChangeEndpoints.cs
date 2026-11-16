using Microsoft.AspNetCore.Mvc;
using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Api.PublicRequests;

public static class PublicRequestChangeEndpoints
{
    public static IEndpointRouteBuilder MapPublicRequestChangeEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/v1/requests/change/access", AccessAsync)
            .WithName("ReadPublicRequestChange")
            .WithMetadata(new RequestSizeLimitAttribute(1024))
            .RequireRateLimiting("public-request-submit").AllowAnonymous()
            .Produces<PublicRequestChangeAccess>()
            .ProducesProblem(StatusCodes.Status400BadRequest);
        endpoints.MapPost("/api/v1/requests/change/resubmit", ResubmitAsync)
            .WithName("ResubmitPublicRequestChange")
            .WithMetadata(new RequestSizeLimitAttribute(16 * 1024))
            .RequireRateLimiting("public-request-submit").AllowAnonymous()
            .Produces<PublicRequestChangeResult>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status400BadRequest);
        return endpoints;
    }

    private static async Task<IResult> AccessAsync(
        RequestChangeTokenInput input, HttpContext context,
        IPublicRequestChangeService service, CancellationToken cancellationToken)
    {
        context.Response.Headers.CacheControl = "no-store";
        try
        {
            var result = await service.ReadAsync(input.Token, cancellationToken);
            return result is null
                ? Results.Problem(statusCode: StatusCodes.Status400BadRequest,
                    title: "Request link is invalid or expired")
                : Results.Ok(result);
        }
        catch (PublicRequestServiceUnavailableException)
        {
            return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Request change service unavailable");
        }
    }

    private static async Task<IResult> ResubmitAsync(
        PublicRequestChangeCommand command, HttpContext context,
        IPublicRequestChangeService service, CancellationToken cancellationToken)
    {
        context.Response.Headers.CacheControl = "no-store";
        try
        {
            var result = await service.ResubmitAsync(command, cancellationToken);
            return result is null
                ? Results.Problem(statusCode: StatusCodes.Status400BadRequest,
                    title: "Request link is invalid or expired")
                : Results.Ok(result);
        }
        catch (PublicRequestValidationException exception)
        {
            return Results.ValidationProblem(exception.Errors);
        }
        catch (PublicRequestServiceUnavailableException)
        {
            return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Request change service unavailable");
        }
    }

    public sealed record RequestChangeTokenInput(string? Token);
}
