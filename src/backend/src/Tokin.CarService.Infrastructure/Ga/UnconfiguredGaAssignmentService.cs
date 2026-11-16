using Tokin.CarService.Application.Ga;
using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Infrastructure.Ga;

internal sealed class UnconfiguredGaAssignmentService : IGaAssignmentService
{
    public Task<GaRequestPage> ListAsync(Guid actorId, int page, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
    public Task<GaRequestDetail?> DetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
    public Task<GaRequestDetail?> AssignAsync(Guid actorId, Guid requestId, GaAssignCommand command, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
    public Task<GaRequestDetail?> RecordDispatchAsync(Guid actorId, Guid requestId, GaDispatchCommand command, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
}
