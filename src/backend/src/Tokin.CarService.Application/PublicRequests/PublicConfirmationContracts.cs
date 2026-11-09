namespace Tokin.CarService.Application.PublicRequests;

public sealed record ConfirmPublicRequestCommand(string? Token);

public sealed record ConfirmPublicRequestResult(string RequestNo, string Status);

public interface IPublicRequestConfirmationService
{
    Task<ConfirmPublicRequestResult?> ConfirmAsync(string? token, CancellationToken cancellationToken);
}
