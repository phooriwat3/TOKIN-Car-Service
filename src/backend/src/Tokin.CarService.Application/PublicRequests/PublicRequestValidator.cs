using System.Globalization;
using System.Net.Mail;
using System.Text.RegularExpressions;
using Tokin.CarService.Domain.Requests;

namespace Tokin.CarService.Application.PublicRequests;

public static partial class PublicRequestValidator
{
    public static ValidatedPublicRequest Validate(
        SubmitPublicRequestCommand command,
        PublicRequestOptions options,
        DateTimeOffset nowInBangkok)
    {
        ArgumentNullException.ThrowIfNull(command);
        ArgumentNullException.ThrowIfNull(options);

        var errors = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        var requestType = ParseRequestType(command.RequestType, errors);
        var requester = command.Requester;
        var requesterName = Required(requester?.Name, "requester.name", 160, errors);
        var requesterEmail = CompanyEmail(requester?.Email, "requester.email", options, errors);
        var employeeId = Required(requester?.EmployeeId, "requester.employeeId", 40, errors);
        if (!EmployeeIdPattern().IsMatch(employeeId))
        {
            Add(errors, "requester.employeeId", "Employee number must contain exactly 7 digits.");
        }

        var departmentCode = Required(requester?.Department, "requester.department", 30, errors)
            .ToUpperInvariant();
        var requesterPhone = Optional(requester?.Phone, 40);
        var usingDate = ParseDate(command.UsingDate, errors);
        var startTime = ParseTime(command.StartTime, "startTime", errors);
        var endTime = ParseTime(command.EndTime, "endTime", errors);
        if (startTime >= endTime)
        {
            Add(errors, "endTime", "End time must be after start time.");
        }

        var today = DateOnly.FromDateTime(nowInBangkok.DateTime);
        if (usingDate < today)
        {
            Add(errors, "usingDate", "Using date cannot be in the past.");
        }
        else if (usingDate > today.AddMonths(6))
        {
            Add(errors, "usingDate", "Using date cannot be more than six months ahead.");
        }

        var pickup = Required(command.PickupLocation, "pickupLocation", 500, errors);
        var destination = Required(command.Destination, "destination", 500, errors);
        var purpose = Required(command.Purpose, "purpose", 1000, errors);
        var meetingPoint = ParseMeetingPoint(command.MeetingPoint, errors);
        var passengers = ValidatePassengers(command.Passengers, errors);
        var overtimeRiders = ValidateOvertimeRiders(
            command.OvertimeEmployees,
            requestType,
            options,
            errors);

        var approverName = Optional(command.Approver?.Name, 160);
        var approverEmail = string.Empty;
        if (requestType == TransportRequestType.OutsideCompany)
        {
            approverEmail = CompanyEmail(command.Approver?.Email, "approver.email", options, errors);
            approverName ??= approverEmail;
        }

        if (requestType == TransportRequestType.Overtime)
        {
            if (!command.TigerSpaceConfirmed)
            {
                Add(errors, "tigerSpaceConfirmed", "Confirm that the OT request was submitted in Tiger Space.");
            }

            var submissionTime = TimeOnly.FromDateTime(nowInBangkok.DateTime);
            if (submissionTime < new TimeOnly(8, 0) || submissionTime >= new TimeOnly(16, 0))
            {
                Add(errors, "requestType", "OT requests can be submitted only from 08:00 to 16:00 Thailand time.");
            }
        }

        var isImmediate = requestType == TransportRequestType.OutsideCompany
            && usingDate == today
            && startTime.ToTimeSpan() - TimeOnly.FromDateTime(nowInBangkok.DateTime).ToTimeSpan()
                <= TimeSpan.FromMinutes(60);
        if (usingDate == today && startTime <= TimeOnly.FromDateTime(nowInBangkok.DateTime))
        {
            Add(errors, "startTime", "Start time must be later than the current Thailand time.");
        }

        var immediateReason = isImmediate
            ? Required(command.ImmediateReason, "immediateReason", 1000, errors)
            : Optional(command.ImmediateReason, 1000);

        if (!string.IsNullOrWhiteSpace(command.Website))
        {
            Add(errors, "website", "Unable to accept this request.");
        }

        if (errors.Count > 0)
        {
            throw new PublicRequestValidationException(
                errors.ToDictionary(x => x.Key, x => x.Value.ToArray(), StringComparer.Ordinal));
        }

        var isLateOt = requestType == TransportRequestType.Overtime
            && TimeOnly.FromDateTime(nowInBangkok.DateTime) >= new TimeOnly(15, 30);

        return new ValidatedPublicRequest(
            requestType,
            requesterName,
            requesterEmail,
            employeeId,
            departmentCode,
            requesterPhone,
            approverName,
            approverEmail,
            usingDate,
            startTime,
            endTime,
            pickup,
            destination,
            purpose,
            meetingPoint,
            command.WithStaff,
            isImmediate,
            isLateOt,
            isLateOt ? "Submitted after the 15:30 OT planning cutoff." : immediateReason,
            passengers,
            overtimeRiders,
            command.TigerSpaceConfirmed);
    }

    private static TransportRequestType ParseRequestType(
        string? value,
        IDictionary<string, List<string>> errors)
    {
        return value?.Trim().ToLowerInvariant() switch
        {
            "outside_company" => TransportRequestType.OutsideCompany,
            "overtime" => TransportRequestType.Overtime,
            _ => InvalidRequestType(errors),
        };
    }

    private static TransportRequestType InvalidRequestType(IDictionary<string, List<string>> errors)
    {
        Add(errors, "requestType", "Request type must be outside_company or overtime.");
        return TransportRequestType.Unknown;
    }

    private static MeetingPoint ParseMeetingPoint(
        string? value,
        IDictionary<string, List<string>> errors)
    {
        return value?.Trim().ToLowerInvariant() switch
        {
            "front_area" => MeetingPoint.FrontArea,
            "loading_area" => MeetingPoint.LoadingArea,
            _ => InvalidMeetingPoint(errors),
        };
    }

    private static MeetingPoint InvalidMeetingPoint(IDictionary<string, List<string>> errors)
    {
        Add(errors, "meetingPoint", "Meeting point must be front_area or loading_area.");
        return MeetingPoint.Unknown;
    }

    private static DateOnly ParseDate(string? value, IDictionary<string, List<string>> errors)
    {
        if (DateOnly.TryParseExact(
            value?.Trim(),
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var result))
        {
            return result;
        }

        Add(errors, "usingDate", "Using date must use YYYY-MM-DD format.");
        return DateOnly.MinValue;
    }

    private static TimeOnly ParseTime(
        string? value,
        string field,
        IDictionary<string, List<string>> errors)
    {
        if (TimeOnly.TryParseExact(
            value?.Trim(),
            ["HH:mm", "HH:mm:ss"],
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var result))
        {
            return result;
        }

        Add(errors, field, "Time must use HH:mm format.");
        return TimeOnly.MinValue;
    }

    private static List<string> ValidatePassengers(
        IReadOnlyList<string>? values,
        IDictionary<string, List<string>> errors)
    {
        if ((values?.Count ?? 0) > 20)
        {
            Add(errors, "passengers", "A request can contain at most 20 passengers.");
        }

        var passengers = new List<string>();
        foreach (var value in values ?? [])
        {
            var name = value.Trim();
            if (name.Length is < 1 or > 160)
            {
                Add(errors, "passengers", "Each passenger name must contain 1 to 160 characters.");
                continue;
            }

            passengers.Add(name);
        }

        return passengers;
    }

    private static List<ValidatedOvertimeRider> ValidateOvertimeRiders(
        IReadOnlyList<PublicOvertimeRiderInput>? values,
        TransportRequestType requestType,
        PublicRequestOptions options,
        IDictionary<string, List<string>> errors)
    {
        if (requestType != TransportRequestType.Overtime)
        {
            return [];
        }

        if (values is not { Count: > 0 })
        {
            Add(errors, "overtimeEmployees", "At least one OT employee is required.");
            return [];
        }

        if (values.Count > 20)
        {
            Add(errors, "overtimeEmployees", "A request can contain at most 20 OT employees.");
        }

        var riders = new List<ValidatedOvertimeRider>();
        for (var index = 0; index < values.Count; index++)
        {
            var prefix = $"overtimeEmployees[{index}]";
            var item = values[index];
            var employeeId = Required(item.EmployeeId, $"{prefix}.employeeId", 40, errors);
            if (!EmployeeIdPattern().IsMatch(employeeId))
            {
                Add(errors, $"{prefix}.employeeId", "Employee number must contain exactly 7 digits.");
            }

            var employeeName = Required(item.EmployeeName, $"{prefix}.employeeName", 160, errors);
            var employeeEmail = CompanyEmail(item.EmployeeEmail, $"{prefix}.employeeEmail", options, errors);
            var workDescription = Required(item.WorkDescription, $"{prefix}.workDescription", 1000, errors);
            var workStart = ParseTime(item.WorkStart, $"{prefix}.workStart", errors);
            var workEnd = ParseTime(item.WorkEnd, $"{prefix}.workEnd", errors);
            if (workStart >= workEnd)
            {
                Add(errors, $"{prefix}.workEnd", "OT end time must be after start time.");
            }
            if (item.TotalWeeklyHours is < 0 or > 60)
            {
                Add(errors, $"{prefix}.totalWeeklyHours", "Weekly hours must be between 0 and 60.");
            }
            if (!item.TransportRequired)
            {
                Add(errors, $"{prefix}.transportRequired", "This form accepts only employees who require transportation.");
            }

            var busStop = Required(item.BusStop, $"{prefix}.busStop", 300, errors);
            riders.Add(new ValidatedOvertimeRider(
                employeeId,
                employeeName,
                employeeEmail,
                Optional(item.EmployeePhone, 40),
                workDescription,
                workStart,
                workEnd,
                item.TotalWeeklyHours,
                busStop));
        }

        return riders;
    }

    private static string Required(
        string? value,
        string field,
        int maximumLength,
        IDictionary<string, List<string>> errors)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (normalized.Length == 0)
        {
            Add(errors, field, "This field is required.");
        }
        else if (normalized.Length > maximumLength)
        {
            Add(errors, field, $"This field cannot exceed {maximumLength} characters.");
        }

        return normalized;
    }

    private static string? Optional(string? value, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        return normalized[..Math.Min(normalized.Length, maximumLength)];
    }

    private static string CompanyEmail(
        string? value,
        string field,
        PublicRequestOptions options,
        IDictionary<string, List<string>> errors)
    {
        var normalized = Required(value, field, 320, errors).ToLowerInvariant();
        try
        {
            var address = new MailAddress(normalized);
            var domain = address.Host;
            if (!options.AllowedEmailDomains.Any(
                    allowed => string.Equals(allowed.Trim(), domain, StringComparison.OrdinalIgnoreCase)))
            {
                Add(errors, field, "Use an approved company email address.");
            }
        }
        catch (FormatException)
        {
            Add(errors, field, "Enter a valid email address.");
        }

        return normalized;
    }

    private static void Add(
        IDictionary<string, List<string>> errors,
        string field,
        string message)
    {
        if (!errors.TryGetValue(field, out var messages))
        {
            messages = [];
            errors[field] = messages;
        }

        if (!messages.Contains(message, StringComparer.Ordinal))
        {
            messages.Add(message);
        }
    }

    [GeneratedRegex("^[0-9]{7}$", RegexOptions.CultureInvariant)]
    private static partial Regex EmployeeIdPattern();
}

public sealed record ValidatedPublicRequest(
    TransportRequestType RequestType,
    string RequesterName,
    string RequesterEmail,
    string RequesterEmployeeId,
    string DepartmentCode,
    string? RequesterPhone,
    string? ApproverName,
    string ApproverEmail,
    DateOnly UsingDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string PickupLocation,
    string Destination,
    string Purpose,
    MeetingPoint MeetingPoint,
    bool WithStaff,
    bool IsImmediate,
    bool IsLateOt,
    string? UrgentReason,
    IReadOnlyList<string> Passengers,
    IReadOnlyList<ValidatedOvertimeRider> OvertimeRiders,
    bool TigerSpaceConfirmed);

public sealed record ValidatedOvertimeRider(
    string EmployeeId,
    string EmployeeName,
    string EmployeeEmail,
    string? EmployeePhone,
    string WorkDescription,
    TimeOnly WorkStart,
    TimeOnly WorkEnd,
    decimal TotalWeeklyHours,
    string BusStop);
