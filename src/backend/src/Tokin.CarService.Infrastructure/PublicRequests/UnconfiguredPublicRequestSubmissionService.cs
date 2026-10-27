using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Infrastructure.PublicRequests;

internal sealed class UnconfiguredPublicRequestSubmissionService : IPublicRequestSubmissionService
{
    public Task<SubmitPublicRequestResult> SubmitAsync(
        SubmitPublicRequestCommand command,
        string idempotencyKey,
        string fingerprintHash,
        CancellationToken cancellationToken)
    {
        throw new PublicRequestServiceUnavailableException();
    }
}
