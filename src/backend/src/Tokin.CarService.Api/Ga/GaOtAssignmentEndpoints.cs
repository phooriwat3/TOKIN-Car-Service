using Microsoft.AspNetCore.Mvc;
using Tokin.CarService.Application.Ga;
using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Api.Ga;

public static class GaOtAssignmentEndpoints
{
    public static IEndpointRouteBuilder MapGaOtAssignmentEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/ga/ot-assignments");
        group.AddEndpointFilter(async (invocation, next) =>
        {
            try { return await next(invocation); }
            catch (UnauthorizedAccessException)
            {
                return Results.Problem(statusCode: StatusCodes.Status403Forbidden,
                    title: "GA administrator access required");
            }
        });
        group.MapGet("", ListAsync).WithName("ListGaOtAssignments")
            .RequireRateLimiting("public-reference-read");
        group.MapGet("/{requestId:guid}", DetailAsync).WithName("ReadGaOtAssignment")
            .RequireRateLimiting("public-reference-read");
        group.MapPost("/{requestId:guid}/assign", AssignAsync).WithName("AssignGaOtRequest")
            .WithMetadata(new RequestSizeLimitAttribute(16384))
            .RequireRateLimiting("public-request-submit");
        group.MapPost("/{requestId:guid}/units/{unitId:guid}/dispatch", DispatchAsync)
            .WithName("RecordGaOtLineDispatch")
            .WithMetadata(new RequestSizeLimitAttribute(1024))
            .RequireRateLimiting("public-request-submit");
        return endpoints;
    }

    private static Guid Actor(HttpContext context) => (Guid)context.Items[GaGatewayMiddleware.ActorKey]!;

    private static async Task<IResult> ListAsync(int? page, HttpContext context,
        IGaOtAssignmentService service, CancellationToken cancellationToken)
    {
        var pageNumber = page ?? 1;
        return pageNumber is < 1 or > 10000
            ? Results.BadRequest(new { error = "Invalid page." })
            : Results.Ok(await service.ListAsync(Actor(context), pageNumber, cancellationToken));
    }

    private static async Task<IResult> DetailAsync(Guid requestId, HttpContext context,
        IGaOtAssignmentService service, CancellationToken cancellationToken)
    {
        var detail = await service.DetailAsync(Actor(context), requestId, cancellationToken);
        return detail is null ? Results.NotFound() : Results.Ok(detail);
    }

    private static async Task<IResult> AssignAsync(Guid requestId, GaOtAssignCommand command,
        HttpContext context, IGaOtAssignmentService service, CancellationToken cancellationToken)
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

    private static async Task<IResult> DispatchAsync(Guid requestId, Guid unitId, GaDispatchCommand command,
        HttpContext context, IGaOtAssignmentService service, CancellationToken cancellationToken)
    {
        try
        {
            var detail = await service.RecordDispatchAsync(Actor(context), requestId, unitId, command, cancellationToken);
            return detail is null ? Results.NotFound() : Results.Ok(detail);
        }
        catch (PublicRequestValidationException exception)
        {
            return Results.ValidationProblem(exception.Errors);
        }
    }
}
