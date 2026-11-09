using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection;
using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Application.ReferenceData;
using Tokin.CarService.Infrastructure.Persistence;
using Tokin.CarService.Infrastructure.PublicRequests;
using Tokin.CarService.Infrastructure.ReferenceData;

namespace Tokin.CarService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        bool requireProtectedKeyRing = false)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        var connectionString = configuration.GetConnectionString("PrimaryDatabase");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            if (requireProtectedKeyRing)
            {
                throw new InvalidOperationException(
                    "ConnectionStrings:PrimaryDatabase is required when hosting the SQL Server API.");
            }

            services.AddSingleton<IPublicRequestSubmissionService, UnconfiguredPublicRequestSubmissionService>();
            services.AddSingleton<IPublicRequestConfirmationService, UnconfiguredPublicRequestConfirmationService>();
            services.AddSingleton<IPublicReferenceDataService, UnconfiguredPublicReferenceDataService>();
            return services;
        }

        ConfigureDataProtection(services, configuration, requireProtectedKeyRing);
        services.AddSingleton<TimeProvider>(TimeProvider.System);
        services.AddSingleton<ISecureActionTokenService, SecureActionTokenService>();
        services.AddScoped<IPublicRequestSubmissionService, PublicRequestSubmissionService>();
        services.AddScoped<IPublicRequestConfirmationService, PublicRequestConfirmationService>();
        services.AddScoped<IPublicReferenceDataService, PublicReferenceDataService>();
        services.AddPooledDbContextFactory<CarServiceDbContext>(options =>
            options.UseSqlServer(connectionString, sqlServer =>
            {
                sqlServer.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                sqlServer.MigrationsHistoryTable("__EFMigrationsHistory", "infrastructure");
            }));

        return services;
    }

    private static void ConfigureDataProtection(
        IServiceCollection services,
        IConfiguration configuration,
        bool requireProtectedKeyRing)
    {
        var keysPath = configuration["DataProtection:KeysPath"];
        var certificatePath = configuration["DataProtection:CertificatePath"];
        var certificatePassword = configuration["DataProtection:CertificatePassword"];

        if (string.IsNullOrWhiteSpace(keysPath) && string.IsNullOrWhiteSpace(certificatePath))
        {
            if (requireProtectedKeyRing)
            {
                throw new InvalidOperationException(
                    "DataProtection:KeysPath and DataProtection:CertificatePath are required when hosting the SQL Server API.");
            }

            services.AddDataProtection().SetApplicationName("Tokin.CarService");
            return;
        }

        if (string.IsNullOrWhiteSpace(keysPath)
            || string.IsNullOrWhiteSpace(certificatePath)
            || (requireProtectedKeyRing && string.IsNullOrWhiteSpace(certificatePassword))
            || !Path.IsPathFullyQualified(keysPath)
            || !Path.IsPathFullyQualified(certificatePath)
            || !Directory.Exists(keysPath)
            || !File.Exists(certificatePath))
        {
            throw new InvalidOperationException(
                "Data Protection requires an existing absolute key directory, PFX certificate path, and a hosted certificate password.");
        }

        var probePath = Path.Combine(keysPath, $".tokin-write-probe-{Guid.NewGuid():N}");
        try
        {
            using var probe = new FileStream(probePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException(
                "The Data Protection key directory must be writable by the API process.",
                exception);
        }
        finally
        {
            if (File.Exists(probePath))
            {
                File.Delete(probePath);
            }
        }

        var certificate = X509CertificateLoader.LoadPkcs12FromFile(
            certificatePath,
            certificatePassword);
        if (!certificate.HasPrivateKey
            || DateTime.UtcNow < certificate.NotBefore.ToUniversalTime()
            || DateTime.UtcNow >= certificate.NotAfter.ToUniversalTime())
        {
            certificate.Dispose();
            throw new InvalidOperationException(
                "The Data Protection PFX certificate must contain a valid private key.");
        }

        services.AddDataProtection()
            .SetApplicationName("Tokin.CarService")
            .PersistKeysToFileSystem(new DirectoryInfo(keysPath))
            .ProtectKeysWithCertificate(certificate);
    }
}
