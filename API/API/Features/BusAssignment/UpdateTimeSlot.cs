
namespace API.Features.BusAssignment;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record UpdateTimeSlotCommand(
    int? SlotNumber = null,
    TimeOnly? StartTime = null,
    TimeOnly? EndTime = null,
    TimeSlotStatus? Status = null,
    TimeOnly? ActualStartTime = null,
    TimeOnly? ActualEndTime = null,
    string? Notes = null
);

public class UpdateTimeSlotValidator : AbstractValidator<UpdateTimeSlotCommand>
{
    public UpdateTimeSlotValidator()
    {
        RuleFor(x => x.SlotNumber)
            .GreaterThan(0)
            .When(x => x.SlotNumber.HasValue);

        RuleFor(x => x.StartTime)
            .LessThan(x => x.EndTime)
            .When(x => x.StartTime.HasValue && x.EndTime.HasValue)
            .WithMessage("Start time must be before end time.");

        RuleFor(x => x.ActualStartTime)
            .LessThan(x => x.ActualEndTime)
            .When(x => x.ActualStartTime.HasValue && x.ActualEndTime.HasValue)
            .WithMessage("Actual start time must be before actual end time.");
    }
}

public static class UpdateTimeSlot
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, BadRequest<string>, NoContent>
    > Handler(
        int assignmentId,
        int slotId,
        IValidator<UpdateTimeSlotCommand> validator,
        UpdateTimeSlotCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var timeSlot = await db.TimeSlots
            .Include(ts => ts.BusAssignment)
                .ThenInclude(a => a.TimeSlots)
            .FirstOrDefaultAsync(ts => ts.Id == slotId && ts.BusAssignmentId == assignmentId, ct);

        if (timeSlot == null)
            return TypedResults.NotFound();

        var assignment = timeSlot.BusAssignment;

        // Cannot update slots in completed or cancelled assignments
        if (assignment.Status == AssignmentStatus.Completed || assignment.Status == AssignmentStatus.Cancelled)
            return TypedResults.BadRequest($"Cannot update time slots in assignment with status '{assignment.Status}'.");

        var slotUpdated = false;

        // Update slot number
        if (command.SlotNumber.HasValue && command.SlotNumber.Value != timeSlot.SlotNumber)
        {
            // Check if new slot number already exists
            if (assignment.TimeSlots.Any(ts => ts.Id != slotId && ts.SlotNumber == command.SlotNumber.Value))
                return TypedResults.Conflict($"Slot number {command.SlotNumber.Value} already exists in this assignment.");

            timeSlot.SlotNumber = command.SlotNumber.Value;
            slotUpdated = true;
        }

        // Update times (check for overlaps)
        if ((command.StartTime.HasValue || command.EndTime.HasValue) &&
            (timeSlot.Status == TimeSlotStatus.Scheduled || timeSlot.Status == TimeSlotStatus.Cancelled))
        {
            var newStartTime = command.StartTime ?? timeSlot.StartTime;
            var newEndTime = command.EndTime ?? timeSlot.EndTime;

            if (newStartTime >= newEndTime)
                return TypedResults.BadRequest("Start time must be before end time.");

            // Check for overlaps with other slots
            var overlaps = assignment.TimeSlots
                .Where(ts => ts.Id != slotId)
                .Any(ts => newStartTime < ts.EndTime && newEndTime > ts.StartTime);

            if (overlaps)
                return TypedResults.Conflict($"Time slot overlaps with existing slot.");

            timeSlot.StartTime = newStartTime;
            timeSlot.EndTime = newEndTime;
            slotUpdated = true;
        }

        // Update status with validation
        if (command.Status.HasValue && command.Status.Value != timeSlot.Status)
        {
            if (!IsValidStatusTransition(timeSlot.Status, command.Status.Value, timeSlot))
                return TypedResults.BadRequest($"Invalid status transition from '{timeSlot.Status}' to '{command.Status.Value}'.");

            timeSlot.Status = command.Status.Value;
            slotUpdated = true;
        }

        // Update actual times (only for InProgress/Completed status)
        if (command.ActualStartTime.HasValue)
        {
            if (timeSlot.Status != TimeSlotStatus.InProgress && timeSlot.Status != TimeSlotStatus.Completed)
                return TypedResults.BadRequest($"Cannot set actual start time for slot with status '{timeSlot.Status}'.");

            timeSlot.ActualStartTime = command.ActualStartTime.Value;
            slotUpdated = true;
        }

        if (command.ActualEndTime.HasValue)
        {
            if (timeSlot.Status != TimeSlotStatus.Completed)
                return TypedResults.BadRequest($"Cannot set actual end time for slot with status '{timeSlot.Status}'.");

            timeSlot.ActualEndTime = command.ActualEndTime.Value;
            slotUpdated = true;
        }

        // Update notes
        if (command.Notes != null && command.Notes != timeSlot.Notes)
        {
            timeSlot.Notes = command.Notes;
            slotUpdated = true;
        }

        if (slotUpdated)
        {
            // Update assignment status based on slot changes
            assignment.UpdateStatus();
            await db.SaveChangesAsync(ct);
        }

        return TypedResults.NoContent();
    }

    private static bool IsValidStatusTransition(TimeSlotStatus current, TimeSlotStatus next, TimeSlot timeSlot)
    {
        return next switch
        {
            TimeSlotStatus.Scheduled => current == TimeSlotStatus.Scheduled || current == TimeSlotStatus.Cancelled,
            TimeSlotStatus.InProgress => current == TimeSlotStatus.Scheduled && !timeSlot.ActualStartTime.HasValue,
            TimeSlotStatus.Completed => current == TimeSlotStatus.InProgress && timeSlot.ActualStartTime.HasValue,
            TimeSlotStatus.Skipped => current == TimeSlotStatus.Scheduled,
            TimeSlotStatus.Cancelled => current != TimeSlotStatus.Completed && current != TimeSlotStatus.InProgress,
            _ => false
        };
    }

    internal static void MapUpdateTimeSlot(this IEndpointRouteBuilder app) =>
        app.MapPut("/{assignmentId:int}/slots/{slotId:int}", Handler)
            .WithSummary("Update a time slot")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));
}