using Microsoft.AspNetCore.Mvc;

namespace API.Features.BusAssignment;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record AddTimeSlotCommand(
    int SlotNumber,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string? Notes = null
);

public class AddTimeSlotValidator : AbstractValidator<AddTimeSlotCommand>
{
    public AddTimeSlotValidator()
    {
        RuleFor(x => x.SlotNumber)
            .GreaterThan(0)
            .WithMessage("Slot number must be greater than 0.");

        RuleFor(x => x.StartTime)
            .LessThan(x => x.EndTime)
            .WithMessage("Start time must be before end time.");

        RuleFor(x => x.EndTime)
            .GreaterThan(x => x.StartTime)
            .WithMessage("End time must be after start time.");
    }
}

public static class AddTimeSlot
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, BadRequest<string>, Created<TimeSlotResponse>>
    > Handler(
        int assignmentId,
        IValidator<AddTimeSlotCommand> validator,
        [FromBody] AddTimeSlotCommand command, // Bind from Body
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var assignment = await db.BusAssignments
            .Include(a => a.TimeSlots)
            .FirstOrDefaultAsync(a => a.Id == assignmentId, ct);

        if (assignment == null)
            return TypedResults.NotFound();

        // Cannot add slots to completed or cancelled assignments
        if (assignment.Status == AssignmentStatus.Completed || assignment.Status == AssignmentStatus.Cancelled)
            return TypedResults.BadRequest($"Cannot add time slots to assignment with status '{assignment.Status}'.");

        // Check if slot number already exists
        if (assignment.TimeSlots.Any(ts => ts.SlotNumber == command.SlotNumber))
            return TypedResults.Conflict($"Slot number {command.SlotNumber} already exists in this assignment.");

        // Check for overlapping time slots
        var overlaps = assignment.TimeSlots.Any(ts =>
            command.StartTime < ts.EndTime && command.EndTime > ts.StartTime);

        if (overlaps)
            return TypedResults.Conflict($"Time slot overlaps with existing slot {command.StartTime:HH:mm} - {command.EndTime:HH:mm}.");

        // Check if any time slot is in progress or completed
        var hasActiveSlots = assignment.TimeSlots.Any(ts =>
            ts.Status == TimeSlotStatus.InProgress || ts.Status == TimeSlotStatus.Completed);

        if (hasActiveSlots)
            return TypedResults.BadRequest("Cannot add slots to assignment with active or completed time slots.");

        var timeSlot = new TimeSlot
        {
            BusAssignmentId = assignmentId,
            SlotNumber = command.SlotNumber,
            StartTime = command.StartTime,
            EndTime = command.EndTime,
            Status = TimeSlotStatus.Scheduled,
            Notes = command.Notes
        };

        db.TimeSlots.Add(timeSlot);
        await db.SaveChangesAsync(ct);

        // Update assignment status based on new slot configuration
        assignment.UpdateStatus();
        await db.SaveChangesAsync(ct);

        var response = new TimeSlotResponse(
            timeSlot.Id,
            timeSlot.BusAssignmentId,
            timeSlot.SlotNumber,
            timeSlot.StartTime,
            timeSlot.EndTime,
            timeSlot.Status,
            timeSlot.ActualStartTime,
            timeSlot.ActualEndTime,
            timeSlot.Notes
        );

        return TypedResults.Created($"/assignments/{assignmentId}/slots/{timeSlot.Id}", response);
    }

    internal static void MapAddTimeSlot(this IEndpointRouteBuilder app) =>
        app.MapPost("/{assignmentId:int}/slots", Handler)
            .WithSummary("Add a time slot to a bus assignment")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}