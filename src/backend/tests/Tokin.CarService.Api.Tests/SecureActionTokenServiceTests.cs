using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Tokin.CarService.Infrastructure.PublicRequests;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class SecureActionTokenServiceTests
{
    [Fact]
    public void IssuedTokenStoresOnlyHashAndProtectedValue()
    {
        var provider = new EphemeralDataProtectionProvider();
        var service = new SecureActionTokenService(provider);

        var issued = service.Issue("requester-confirmation:v1");
        var plaintext = provider
            .CreateProtector(
                "Tokin.CarService",
                "PublicRequestActionToken",
                "requester-confirmation:v1")
            .Unprotect(issued.ProtectedToken);
        var expectedHash = Convert.ToHexStringLower(
            SHA256.HashData(Encoding.UTF8.GetBytes(plaintext)));

        Assert.Equal(43, plaintext.Length);
        Assert.Equal(expectedHash, issued.TokenHash);
        Assert.DoesNotContain(plaintext, issued.ProtectedToken, StringComparison.Ordinal);
    }
}
