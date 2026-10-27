using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Infrastructure.Persistence;
using Tokin.CarService.Infrastructure.PublicRequests;

namespace Tokin.CarService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        var connectionString = configuration.GetConnectionString("PrimaryDatabase");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddSingleton<IPublicRequestSubmissionService, UnconfiguredPublicRequestSubmissionService>();
            return services;
        }

        services.AddDataProtection().SetApplicationName("Tokin.CarService");
        services.AddSingleton<TimeProvider>(TimeProvider.System);
        services.AddSingleton<ISecureActionTokenService, SecureActionTokenService>();
        services.AddScoped<IPublicRequestSubmissionService, PublicRequestSubmissionService>();
        services.AddPooledDbContextFactory<CarServiceDbContext>(options =>
            options.UseSqlServer(connectionString, sqlServer =>
            {
                sqlServer.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                sqlServer.MigrationsHistoryTable("__EFMigrationsHistory", "infrastructure");
            }));

        return services;
    }
}
