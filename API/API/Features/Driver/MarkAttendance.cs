namespace API.Features.Driver;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record MarkAttendanceCommand(
    int DriverProfileId,
    DateOnly Date,
    AttendanceStatus Status,
    TimeOnly? CheckInTime = null,
    TimeOnly? CheckOutTime = null,
    string? Remarks = null
);

public class MarkAttendanceValidator : AbstractValidator<MarkAttendanceCommand>
{
    public MarkAttendanceValidator()
    {
        RuleFor(x => x.DriverProfileId).GreaterThan(0);
        RuleFor(x => x.Date)
            .LessThanOrEqualTo(DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Cannot mark attendance for future dates.");
        
        RuleFor(x => x.CheckOutTime)
            .GreaterThan(x => x.CheckInTime)
            .When(x => x.CheckInTime.HasValue && x.CheckOutTime.HasValue)
            .WithMessage("Check-out time must be after check-in time.");
    }
}
public static class MarkAttendance
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, BadRequest<string>,Created<DriverAttendanceResponse>>
    > Handler(
        IValidator<MarkAttendanceCommand> validator,
        MarkAttendanceCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        // Check if driver exists and is active
        var driver = await db.DriverProfiles
            .FirstOrDefaultAsync(d => d.Id == command.DriverProfileId, ct);
        if (driver is null)
            return TypedResults.NotFound();

        if (!driver.IsActive)
            return TypedResults.BadRequest("Cannot mark attendance for inactive driver.");

        // Check if attendance already marked for this date
        var existingAttendance = await db.DriverAttendances
            .AnyAsync(a => a.DriverProfileId == command.DriverProfileId && 
                          a.Date == command.Date, ct);
        if (existingAttendance)
            return TypedResults.Conflict($"Attendance already marked for date: {command.Date}");

        var attendance = new DriverAttendance
        {
            DriverProfileId = command.DriverProfileId,
            Date = command.Date,
            Status = command.Status,
            CheckInTime = command.CheckInTime,
            CheckOutTime = command.CheckOutTime,
            Remarks = command.Remarks
        };

        db.DriverAttendances.Add(attendance);
        await db.SaveChangesAsync(ct);

        var response = new DriverAttendanceResponse(
            attendance.Id,
            attendance.DriverProfileId,
            attendance.Date,
            attendance.Status,
            attendance.CheckInTime,
            attendance.CheckOutTime,
            attendance.Remarks
        );

        return TypedResults.Created($"/attendance/{attendance.Id}", response);
    }

    internal static void MapMarkAttendance(this IEndpointRouteBuilder app) =>
        app.MapPost("/", Handler)
            .WithSummary("Mark driver attendance")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}