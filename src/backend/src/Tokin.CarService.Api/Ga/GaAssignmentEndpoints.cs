using Microsoft.AspNetCore.Mvc;
using Tokin.CarService.Application.Ga;
using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Api.Ga;

public static class GaAssignmentEndpoints
{
    public static IEndpointRouteBuilder MapGaAssignmentEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/ga");
        group.AddEndpointFilter(async (invocation, next) =>
        {
            try { return await next(invocation); }
            catch (UnauthorizedAccessException)
            {
                return Results.Problem(statusCode: StatusCodes.Status403Forbidden,
                    title: "GA administrator access required");
            }
        });
        group.MapGet("/requests", ListAsync).WithName("ListGaRequests")
            .RequireRateLimiting("public-reference-read");
        group.MapGet("/requests/{requestId:guid}", DetailAsync).WithName("ReadGaRequest")
            .RequireRateLimiting("public-reference-read");
        group.MapPost("/requests/{requestId:guid}/assign", AssignAsync).WithName("AssignGaRequest")
            .WithMetadata(new RequestSizeLimitAttribute(4096))
            .RequireRateLimiting("public-request-submit");
        group.MapPost("/requests/{requestId:guid}/dispatch", DispatchAsync).WithName("RecordGaLineDispatch")
            .WithMetadata(new RequestSizeLimitAttribute(1024))
            .RequireRateLimiting("public-request-submit");
        return endpoints;
    }

    private static Guid Actor(HttpContext context) => (Guid)context.Items[GaGatewayMiddleware.ActorKey]!;

    private static async Task<IResult> ListAsync(int? page, HttpContext context, IGaAssignmentService service,
        CancellationToken cancellationToken)
    {
        var pageNumber = page ?? 1;
        return pageNumber is < 1 or > 10000
            ? Results.BadRequest(new { error = "Invalid page." })
            : Results.Ok(await service.ListAsync(Actor(context), pageNumber, cancellationToken));
    }

    private static async Task<IResult> DetailAsync(Guid requestId, HttpContext context,
        IGaAssignmentService service, CancellationToken cancellationToken)
    {
        var detail = await service.DetailAsync(Actor(context), requestId, cancellationToken);
        return detail is null ? Results.NotFound() : Results.Ok(detail);
    }

    private static async Task<IResult> AssignAsync(Guid requestId, GaAssignCommand command,
        HttpContext context, IGaAssignmentService service, CancellationToken cancellationToken)
    {
        try
        {
            var detail = await service.AssignAsync(Actor(context), requestId, command, cancellationToken);
            return detail is null ? Results.NotFound() : Results.Ok(detail);
        }
        catch (PublicRequestValidationException exception)
        {
            return Results.ValidationProblem(exception.Errors);
        }
        catch (GaAssignmentConflictException exception)
        {
            return Results.Problem(statusCode: StatusCodes.Status409Conflict,
                title: "Assignment conflict", detail: exception.Message);
        }
    }

    private static async Task<IResult> DispatchAsync(Guid requestId, GaDispatchCommand command,
        HttpContext context, IGaAssignmentService service, CancellationToken cancellationToken)
    {
        try
        {
            var detail = await service.RecordDispatchAsync(Actor(context), requestId, command, cancellationToken);
            return detail is null ? Results.NotFound() : Results.Ok(detail);
        }
        catch (PublicRequestValidationException exception)
        {
            return Results.ValidationProblem(exception.Errors);
        }
    }
}
