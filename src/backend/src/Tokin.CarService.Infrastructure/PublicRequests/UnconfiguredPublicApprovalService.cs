using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Infrastructure.PublicRequests;

internal sealed class UnconfiguredPublicApprovalService : IPublicApprovalService
{
    public Task<PublicApprovalAccess?> ReadAsync(string? token, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();

    public Task<PublicApprovalActionResult?> DecideAsync(
        PublicApprovalActionCommand command,
        CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
}
