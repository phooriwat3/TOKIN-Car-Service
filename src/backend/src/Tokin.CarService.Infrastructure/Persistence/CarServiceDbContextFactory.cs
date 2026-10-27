using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Tokin.CarService.Infrastructure.Persistence;

public sealed class CarServiceDbContextFactory : IDesignTimeDbContextFactory<CarServiceDbContext>
{
    private const string DesignConnection =
        "Server=(localdb)\\MSSQLLocalDB;Database=TOKIN_CarService_Design;Trusted_Connection=True;TrustServerCertificate=False";

    public CarServiceDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("TOKIN_SQLSERVER_DESIGN_CONNECTION");
        var options = new DbContextOptionsBuilder<CarServiceDbContext>()
            .UseSqlServer(
                string.IsNullOrWhiteSpace(connectionString) ? DesignConnection : connectionString,
                sqlServer => sqlServer.MigrationsHistoryTable("__EFMigrationsHistory", "infrastructure"))
            .Options;

        return new CarServiceDbContext(options);
    }
}
