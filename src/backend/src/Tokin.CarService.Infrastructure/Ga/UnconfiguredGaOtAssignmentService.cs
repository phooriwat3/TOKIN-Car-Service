using Tokin.CarService.Application.Ga;
using Tokin.CarService.Application.PublicRequests;

namespace Tokin.CarService.Infrastructure.Ga;

internal sealed class UnconfiguredGaOtAssignmentService : IGaOtAssignmentService
{
    public Task<GaRequestPage> ListAsync(Guid actorId, int page, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
    public Task<GaOtAssignmentDetail?> DetailAsync(Guid actorId, Guid requestId, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
    public Task<GaOtAssignmentDetail?> AssignAsync(Guid actorId, Guid requestId,
        GaOtAssignCommand command, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
    public Task<GaOtAssignmentDetail?> RecordDispatchAsync(Guid actorId, Guid requestId,
        Guid unitId, GaDispatchCommand command, CancellationToken cancellationToken) =>
        throw new PublicRequestServiceUnavailableException();
}
