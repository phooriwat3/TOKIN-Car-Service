using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Infrastructure.PublicRequests;

internal sealed class UnconfiguredPublicRequestConfirmationService : IPublicRequestConfirmationService
{
    public Task<ConfirmPublicRequestResult?> ConfirmAsync(string? token, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
}
