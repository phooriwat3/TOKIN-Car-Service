using Microsoft.AspNetCore.Mvc;
using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Api.PublicRequests;

public static class PublicApprovalEndpoints
{
    public static IEndpointRouteBuilder MapPublicApprovalEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/v1/approvals/access", AccessAsync)
            .WithName("ReadPublicApproval")
            .WithMetadata(new RequestSizeLimitAttribute(1024))
            .RequireRateLimiting("public-request-submit")
            .AllowAnonymous()
            .Produces<PublicApprovalAccess>()
            .ProducesProblem(StatusCodes.Status400BadRequest);

        endpoints.MapPost("/api/v1/approvals/action", DecideAsync)
            .WithName("DecidePublicApproval")
            .WithMetadata(new RequestSizeLimitAttribute(4096))
            .RequireRateLimiting("public-request-submit")
            .AllowAnonymous()
            .Produces<PublicApprovalActionResult>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status400BadRequest);
        return endpoints;
    }

    private static async Task<IResult> AccessAsync(
        ApprovalTokenInput input,
        HttpContext context,
        IPublicApprovalService service,
        CancellationToken cancellationToken)
    {
        context.Response.Headers.CacheControl = "no-store";
        try
        {
            var result = await service.ReadAsync(input.Token, cancellationToken);
            return result is null
                ? Results.Problem(statusCode: StatusCodes.Status400BadRequest,
                    title: "Approval link is invalid or expired")
                : Results.Ok(result);
        }
        catch (PublicRequestServiceUnavailableException)
        {
            return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Approval service unavailable");
        }
    }

    private static async Task<IResult> DecideAsync(
        PublicApprovalActionCommand command,
        HttpContext context,
        IPublicApprovalService service,
        CancellationToken cancellationToken)
    {
        context.Response.Headers.CacheControl = "no-store";
        try
        {
            var result = await service.DecideAsync(command, cancellationToken);
            return result is null
                ? Results.Problem(statusCode: StatusCodes.Status400BadRequest,
                    title: "Approval link is invalid or expired")
                : Results.Ok(result);
        }
        catch (PublicRequestValidationException exception)
        {
            return Results.ValidationProblem(exception.Errors);
        }
        catch (PublicRequestServiceUnavailableException)
        {
            return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Approval service unavailable");
        }
    }

    public sealed record ApprovalTokenInput(string? Token);
}
