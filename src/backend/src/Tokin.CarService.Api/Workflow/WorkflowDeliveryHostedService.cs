using Tokin.CarService.Infrastructure.Workflow;

namespace Tokin.CarService.Api.Workflow;

internal sealed partial class WorkflowDeliveryHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<WorkflowDeliveryHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var processor = scope.ServiceProvider.GetRequiredService<IWorkflowOutboxProcessor>();
                var processed = await processor.ProcessOneAsync(stoppingToken);
                if (processed) continue;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                LogDeliveryFailure(logger, exception);
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Workflow delivery cycle failed.")]
    private static partial void LogDeliveryFailure(ILogger logger, Exception exception);
}
