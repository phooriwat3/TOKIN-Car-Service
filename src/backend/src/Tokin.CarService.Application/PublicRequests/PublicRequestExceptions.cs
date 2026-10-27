namespace Tokin.CarService.Application.PublicRequests;

public sealed class PublicRequestValidationException(
    IReadOnlyDictionary<string, string[]> errors)
    : Exception("The public request is invalid.")
{
    public IReadOnlyDictionary<string, string[]> Errors { get; } = errors;
}

public sealed class PublicRequestConflictException(string message) : Exception(message);

public sealed class PublicRequestRateLimitException : Exception
{
    public PublicRequestRateLimitException()
        : base("Too many requests were submitted. Please wait and try again.")
    {
    }
}

public sealed class PublicRequestServiceUnavailableException : Exception
{
    public PublicRequestServiceUnavailableException()
        : base("The request service is not configured.")
    {
    }
}
