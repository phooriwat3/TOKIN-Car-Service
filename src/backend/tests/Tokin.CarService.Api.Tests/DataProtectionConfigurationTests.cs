using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Tokin.CarService.Infrastructure;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class DataProtectionConfigurationTests
{
    [Fact]
    public void HostedModeRequiresDatabaseAndProtectedKeyRing()
    {
        var noDatabase = Configuration(new Dictionary<string, string?>());
        Assert.Throws<InvalidOperationException>(() => new ServiceCollection()
            .AddInfrastructure(noDatabase, requireProtectedKeyRing: true));

        var noKeyRing = Configuration(new Dictionary<string, string?>
        {
            ["ConnectionStrings:PrimaryDatabase"] = "Server=localhost;Database=Unused;Integrated Security=True",
        });
        Assert.Throws<InvalidOperationException>(() => new ServiceCollection()
            .AddInfrastructure(noKeyRing, requireProtectedKeyRing: true));
    }

    [Fact]
    public void ProtectedReferencesSurviveServiceRestartWithEncryptedKeys()
    {
        var directory = Path.Combine(Path.GetTempPath(), "tokin-key-ring-test-" + Guid.NewGuid().ToString("N"));
        var keysPath = Path.Combine(directory, "keys");
        var certificatePath = Path.Combine(directory, "key-ring.pfx");
        const string certificatePassword = "DisposableTestCertificateOnly!";
        Directory.CreateDirectory(keysPath);

        try
        {
            using (var rsa = RSA.Create(2048))
            {
                var request = new CertificateRequest(
                    "CN=TokinCarServiceTest",
                    rsa,
                    HashAlgorithmName.SHA256,
                    RSASignaturePadding.Pkcs1);
                using var certificate = request.CreateSelfSigned(
                    DateTimeOffset.UtcNow.AddDays(-1),
                    DateTimeOffset.UtcNow.AddDays(2));
                File.WriteAllBytes(certificatePath, certificate.Export(
                    X509ContentType.Pfx,
                    certificatePassword));
            }

            var configuration = Configuration(new Dictionary<string, string?>
            {
                ["ConnectionStrings:PrimaryDatabase"] = "Server=localhost;Database=Unused;Integrated Security=True",
                ["DataProtection:KeysPath"] = keysPath,
                ["DataProtection:CertificatePath"] = certificatePath,
                ["DataProtection:CertificatePassword"] = certificatePassword,
            });

            string protectedValue;
            using (var first = BuildProvider(configuration))
            {
                protectedValue = first.GetRequiredService<IDataProtectionProvider>()
                    .CreateProtector("Tokin.CarService", "PublicApproverReference", "v1")
                    .Protect("test-approver");
            }

            var keyFiles = Directory.GetFiles(keysPath, "key-*.xml");
            Assert.NotEmpty(keyFiles);
            Assert.Contains("EncryptedData", File.ReadAllText(keyFiles[0]));

            using var restarted = BuildProvider(configuration);
            var unprotected = restarted.GetRequiredService<IDataProtectionProvider>()
                .CreateProtector("Tokin.CarService", "PublicApproverReference", "v1")
                .Unprotect(protectedValue);
            Assert.Equal("test-approver", unprotected);
        }
        finally
        {
            if (Directory.Exists(directory))
            {
                Directory.Delete(directory, recursive: true);
            }
        }
    }

    private static ServiceProvider BuildProvider(IConfiguration configuration)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddInfrastructure(configuration, requireProtectedKeyRing: true);
        return services.BuildServiceProvider();
    }

    private static IConfiguration Configuration(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();
}
