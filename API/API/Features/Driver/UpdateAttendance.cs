namespace API.Features.Driver;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;

public record UpdateAttendanceCommand(
    AttendanceStatus? Status = null,
    TimeOnly? CheckInTime = null,
    TimeOnly? CheckOutTime = null,
    string? Remarks = null
);

public class UpdateAttendanceValidator : AbstractValidator<UpdateAttendanceCommand>
{
    public UpdateAttendanceValidator()
    {
        RuleFor(x => x.CheckOutTime)
            .GreaterThan(x => x.CheckInTime)
            .When(x => x.CheckInTime.HasValue && x.CheckOutTime.HasValue)
            .WithMessage("Check-out time must be after check-in time.");
    }
}

public static class UpdateAttendance
{
    public static async Task<
        Results<ValidationProblem, NotFound, NoContent>
    > Handler(
        int attendanceId,
        IValidator<UpdateAttendanceCommand> validator,
        UpdateAttendanceCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var attendance = await db.DriverAttendances.FindAsync([attendanceId], ct);
        if (attendance is null)
            return TypedResults.NotFound();

        // Update only provided fields
        if (command.Status.HasValue)
            attendance.Status = command.Status.Value;

        if (command.CheckInTime.HasValue)
            attendance.CheckInTime = command.CheckInTime.Value;

        if (command.CheckOutTime.HasValue)
            attendance.CheckOutTime = command.CheckOutTime.Value;

        if (command.Remarks != null)
            attendance.Remarks = command.Remarks;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapUpdateAttendance(this IEndpointRouteBuilder app) =>
        app.MapPut("/{attendanceId:int}", Handler)
            .WithSummary("Update driver attendance")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}