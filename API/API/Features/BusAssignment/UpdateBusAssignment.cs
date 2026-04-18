using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace API.Features.BusAssignment;

public record UpdateBusAssignmentCommand(
    int? BusId = null,
    int? RouteId = null,
    int? DriverProfileId = null,
    DateOnly? ServiceDate = null,
    AssignmentStatus? Status = null
);

public class UpdateBusAssignmentValidator : AbstractValidator<UpdateBusAssignmentCommand>
{
    public UpdateBusAssignmentValidator()
    {
        RuleFor(x => x.BusId)
            .GreaterThan(0)
            .When(x => x.BusId.HasValue);

        RuleFor(x => x.RouteId)
            .GreaterThan(0)
            .When(x => x.RouteId.HasValue);

        RuleFor(x => x.DriverProfileId)
            .GreaterThan(0)
            .When(x => x.DriverProfileId.HasValue);

        RuleFor(x => x.ServiceDate)
            .GreaterThanOrEqualTo(DateOnly.FromDateTime(DateTime.Today))
            .When(x => x.ServiceDate.HasValue);
    }
}

public static class UpdateBusAssignment
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, NoContent>
    > Handler(
        int id,
        IValidator<UpdateBusAssignmentCommand> validator,
        UpdateBusAssignmentCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var assignment = await db.BusAssignments
            .Include(a => a.TimeSlots)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (assignment == null)
            return TypedResults.NotFound();

        // Prevent updates to completed or cancelled assignments
        if (assignment.Status == AssignmentStatus.Completed || assignment.Status == AssignmentStatus.Cancelled)
            return TypedResults.Conflict($"Cannot update assignment with status '{assignment.Status}'.");

        // Check for conflicts if changing bus, driver, or date
        if (command.BusId.HasValue || command.DriverProfileId.HasValue || command.ServiceDate.HasValue)
        {
            var newBusId = command.BusId ?? assignment.BusId;
            var newDriverId = command.DriverProfileId ?? assignment.DriverProfileId;
            var newDate = command.ServiceDate ?? assignment.ServiceDate;

            // Check bus conflicts
            if (newBusId != assignment.BusId || newDate != assignment.ServiceDate)
            {
                var busConflicts = await db.BusAssignments
                    .Include(a => a.TimeSlots)
                    .Where(a => a.BusId == newBusId && a.ServiceDate == newDate && a.Id != id)
                    .Where(a => a.Status != AssignmentStatus.Cancelled && a.Status != AssignmentStatus.Completed)
                    .SelectMany(a => a.TimeSlots)
                    .AnyAsync(ts => assignment.TimeSlots.Any(aSlot =>
                        (aSlot.StartTime < ts.EndTime && aSlot.EndTime > ts.StartTime)), ct);

                if (busConflicts)
                    return TypedResults.Conflict($"Bus is already assigned during one or more time slots on {newDate:yyyy-MM-dd}.");
            }

            // Check driver conflicts
            if (newDriverId != assignment.DriverProfileId || newDate != assignment.ServiceDate)
            {
                var driverConflicts = await db.BusAssignments
                    .Include(a => a.TimeSlots)
                    .Where(a => a.DriverProfileId == newDriverId && a.ServiceDate == newDate && a.Id != id)
                    .Where(a => a.Status != AssignmentStatus.Cancelled && a.Status != AssignmentStatus.Completed)
                    .SelectMany(a => a.TimeSlots)
                    .AnyAsync(ts => assignment.TimeSlots.Any(aSlot =>
                        (aSlot.StartTime < ts.EndTime && aSlot.EndTime > ts.StartTime)), ct);

                if (driverConflicts)
                    return TypedResults.Conflict($"Driver is already assigned during one or more time slots on {newDate:yyyy-MM-dd}.");
            }
        }

        // Update fields
        var updated = false;

        if (command.BusId.HasValue && command.BusId.Value != assignment.BusId)
        {
            var busExists = await db.Buses.AnyAsync(b => b.Id == command.BusId.Value && b.IsActive, ct);
            if (!busExists)
                return TypedResults.NotFound();

            assignment.BusId = command.BusId.Value;
            updated = true;
        }

        if (command.RouteId.HasValue && command.RouteId.Value != assignment.RouteId)
        {
            var routeExists = await db.Routes.AnyAsync(r => r.Id == command.RouteId.Value && r.IsActive, ct);
            if (!routeExists)
                return TypedResults.NotFound();

            assignment.RouteId = command.RouteId.Value;
            updated = true;
        }

        if (command.DriverProfileId.HasValue && command.DriverProfileId.Value != assignment.DriverProfileId)
        {
            var driverExists = await db.DriverProfiles.AnyAsync(d => d.Id == command.DriverProfileId.Value && d.IsActive, ct);
            if (!driverExists)
                return TypedResults.NotFound();

            assignment.DriverProfileId = command.DriverProfileId.Value;
            updated = true;
        }

        if (command.ServiceDate.HasValue && command.ServiceDate.Value != assignment.ServiceDate)
        {
            assignment.ServiceDate = command.ServiceDate.Value;
            updated = true;
        }

        if (command.Status.HasValue && command.Status.Value != assignment.Status)
        {
            // Validate status transition
            if (!IsValidStatusTransition(assignment.Status, command.Status.Value))
                return TypedResults.Conflict($"Invalid status transition from '{assignment.Status}' to '{command.Status.Value}'.");

            assignment.Status = command.Status.Value;
            updated = true;
        }

        if (updated)
        {
            await db.SaveChangesAsync(ct);
        }

        return TypedResults.NoContent();
    }

    private static bool IsValidStatusTransition(AssignmentStatus current, AssignmentStatus next)
    {
        return next switch
        {
            AssignmentStatus.Draft => current == AssignmentStatus.Draft,
            AssignmentStatus.Scheduled => current == AssignmentStatus.Draft || current == AssignmentStatus.Scheduled,
            AssignmentStatus.InProgress => current == AssignmentStatus.Scheduled,
            AssignmentStatus.PartiallyCompleted => current == AssignmentStatus.InProgress,
            AssignmentStatus.Completed => current == AssignmentStatus.InProgress || current == AssignmentStatus.PartiallyCompleted,
            AssignmentStatus.Cancelled => current != AssignmentStatus.Completed && current != AssignmentStatus.Cancelled,
            _ => false
        };
    }

    internal static void MapUpdateBusAssignment(this IEndpointRouteBuilder app) =>
        app.MapPut("/{id:int}", Handler)
            .WithSummary("Update a bus assignment")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}