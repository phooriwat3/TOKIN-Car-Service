using System.Text.RegularExpressions;
using Tokin.CarService.Application.ReferenceData;

namespace Tokin.CarService.Api.ReferenceData;

public static partial class PublicReferenceDataEndpoints
{
    public static IEndpointRouteBuilder MapPublicReferenceDataEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        var group = endpoints.MapGroup("/api/v1/reference")
            .RequireRateLimiting("public-reference-read")
            .AllowAnonymous();

        group.MapGet("/departments", GetDepartmentsAsync)
            .WithName("GetPublicDepartments")
            .Produces<IReadOnlyList<PublicDepartmentOption>>()
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        group.MapGet("/departments/{departmentCode}/approvers", GetDepartmentApproversAsync)
            .WithName("GetPublicDepartmentApprovers")
            .Produces<PublicDepartmentApprovers>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        return endpoints;
    }

    private static async Task<IResult> GetDepartmentsAsync(
        HttpContext httpContext,
        IPublicReferenceDataService referenceDataService,
        CancellationToken cancellationToken)
    {
        httpContext.Response.Headers.CacheControl = "no-store";
        try
        {
            var departments = await referenceDataService.GetDepartmentsAsync(cancellationToken);
            return Results.Ok(departments);
        }
        catch (PublicReferenceDataServiceUnavailableException exception)
        {
            return Unavailable(exception);
        }
    }

    private static async Task<IResult> GetDepartmentApproversAsync(
        string departmentCode,
        HttpContext httpContext,
        IPublicReferenceDataService referenceDataService,
        CancellationToken cancellationToken)
    {
        httpContext.Response.Headers.CacheControl = "no-store";
        var normalizedCode = departmentCode.Trim().ToUpperInvariant();
        if (!DepartmentCodePattern().IsMatch(normalizedCode))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>(StringComparer.Ordinal)
            {
                ["departmentCode"] =
                ["Department code must contain 1 to 30 letters, numbers, underscores, or hyphens."],
            });
        }

        try
        {
            var result = await referenceDataService.GetDepartmentApproversAsync(
                normalizedCode,
                cancellationToken);
            return result is null
                ? Results.Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Department not found",
                    detail: "The department is unavailable or inactive.")
                : Results.Ok(result);
        }
        catch (PublicReferenceDataServiceUnavailableException exception)
        {
            return Unavailable(exception);
        }
    }

    private static IResult Unavailable(PublicReferenceDataServiceUnavailableException exception)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Reference data unavailable",
            detail: exception.Message);
    }

    [GeneratedRegex("^[A-Z0-9_-]{1,30}$", RegexOptions.CultureInvariant)]
    private static partial Regex DepartmentCodePattern();
}
