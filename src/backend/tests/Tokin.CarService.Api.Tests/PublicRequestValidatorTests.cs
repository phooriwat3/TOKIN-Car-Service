using Tokin.CarService.Application.PublicRequests;
using Tokin.CarService.Domain.Requests;
using Xunit;

namespace Tokin.CarService.Api.Tests;

public sealed class PublicRequestValidatorTests
{
    private static readonly DateTimeOffset BangkokNow = new(2026, 10, 27, 10, 0, 0, TimeSpan.FromHours(7));

    [Fact]
    public void ValidOutsideCompanyRequestIsNormalized()
    {
        var request = CreateValidCommand();

        var validated = PublicRequestValidator.Validate(request, CreateOptions(), BangkokNow);

        Assert.Equal(TransportRequestType.OutsideCompany, validated.RequestType);
        Assert.Equal("phooriwat.pungpech@yageo.com", validated.RequesterEmail);
        Assert.Equal("GA", validated.DepartmentCode);
        Assert.Equal(2, validated.Passengers.Count);
        Assert.False(validated.IsImmediate);
    }

    [Fact]
    public void PersonalEmailIsRejected()
    {
        var request = CreateValidCommand() with
        {
            Requester = CreateValidCommand().Requester! with { Email = "person@example.com" },
        };

        var exception = Assert.Throws<PublicRequestValidationException>(
            () => PublicRequestValidator.Validate(request, CreateOptions(), BangkokNow));

        Assert.Contains("requester.email", exception.Errors.Keys);
    }

    [Fact]
    public void OvertimeRequestWithoutTigerSpaceConfirmationIsRejected()
    {
        var request = CreateValidCommand() with
        {
            RequestType = "overtime",
            Approver = null,
            TigerSpaceConfirmed = false,
            OvertimeEmployees =
            [
                new PublicOvertimeRiderInput(
                    "7654321",
                    "Test Rider",
                    "rider@yageo.com",
                    "0800000000",
                    "Inventory closing",
                    "17:00",
                    "19:00",
                    40,
                    true,
                    "Bang Na"),
            ],
        };

        var exception = Assert.Throws<PublicRequestValidationException>(
            () => PublicRequestValidator.Validate(request, CreateOptions(), BangkokNow));

        Assert.Contains("tigerSpaceConfirmed", exception.Errors.Keys);
    }

    internal static SubmitPublicRequestCommand CreateValidCommand() => new(
        "outside_company",
        new PublicRequesterInput(
            "Phooriwat Pungpech",
            " Phooriwat.Pungpech@yageo.com ",
            "1234567",
            "ga",
            "0800000000"),
        new PublicApproverInput("Test Approver", "approver@yageo.com"),
        "2026-10-28",
        "09:00",
        "12:00",
        "TOKIN Thailand",
        "Customer site",
        "Customer visit",
        "front_area",
        true,
        null,
        ["Employee One", "Employee Two"],
        [],
        false,
        null);

    private static PublicRequestOptions CreateOptions() => new()
    {
        AllowedEmailDomains = ["yageo.com"],
    };
}
