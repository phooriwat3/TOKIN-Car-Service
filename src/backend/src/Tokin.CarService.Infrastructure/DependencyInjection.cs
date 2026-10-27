using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Tokin.CarService.Infrastructure.Persistence;

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
            return services;
        }

        services.AddDbContext<CarServiceDbContext>(options =>
            options.UseSqlServer(connectionString, sqlServer =>
            {
                sqlServer.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                sqlServer.MigrationsHistoryTable("__EFMigrationsHistory", "infrastructure");
            }));

        return services;
    }
}
