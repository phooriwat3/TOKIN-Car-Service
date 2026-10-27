using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;

namespace Tokin.CarService.Infrastructure.PublicRequests;

internal interface ISecureActionTokenService
{
    IssuedActionToken Issue(string purpose);
}

internal sealed record IssuedActionToken(string TokenHash, string ProtectedToken);

internal sealed class SecureActionTokenService(IDataProtectionProvider dataProtectionProvider)
    : ISecureActionTokenService
{
    public IssuedActionToken Issue(string purpose)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(purpose);

        var rawBytes = RandomNumberGenerator.GetBytes(32);
        var plaintextToken = Convert.ToBase64String(rawBytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        var tokenHash = Convert.ToHexStringLower(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plaintextToken)));
        var protector = dataProtectionProvider.CreateProtector(
            "Tokin.CarService",
            "PublicRequestActionToken",
            purpose);

        return new IssuedActionToken(tokenHash, protector.Protect(plaintextToken));
    }
}
