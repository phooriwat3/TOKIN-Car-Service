using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Infrastructure.PublicRequests;

internal sealed class UnconfiguredPublicRequestChangeService : IPublicRequestChangeService
{
    public Task<PublicRequestChangeAccess?> ReadAsync(string? token, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();

    public Task<PublicRequestChangeResult?> ResubmitAsync(PublicRequestChangeCommand command, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
}
