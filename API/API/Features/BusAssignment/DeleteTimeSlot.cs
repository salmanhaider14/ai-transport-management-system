namespace API.Features.BusAssignment;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class DeleteTimeSlot
{
    public static async Task<
        Results<NoContent, NotFound, BadRequest<string>>
    > Handler(
        int assignmentId,
        int slotId,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var timeSlot = await db.TimeSlots
            .Include(ts => ts.BusAssignment)
                .ThenInclude(a => a.TimeSlots)
            .FirstOrDefaultAsync(ts => ts.Id == slotId && ts.BusAssignmentId == assignmentId, ct);

        if (timeSlot == null)
            return TypedResults.NotFound();

        var assignment = timeSlot.BusAssignment;

        // Cannot delete from completed or cancelled assignments
        if (assignment.Status == AssignmentStatus.Completed || assignment.Status == AssignmentStatus.Cancelled)
            return TypedResults.BadRequest($"Cannot delete time slots from assignment with status '{assignment.Status}'.");

        // Cannot delete if slot is in progress or completed
        if (timeSlot.Status == TimeSlotStatus.InProgress || timeSlot.Status == TimeSlotStatus.Completed)
            return TypedResults.BadRequest($"Cannot delete time slot with status '{timeSlot.Status}'.");

        // Cannot delete if it's the last slot
        if (assignment.TimeSlots.Count <= 1)
            return TypedResults.BadRequest("Cannot delete the last time slot. Cancel the assignment instead.");

        db.TimeSlots.Remove(timeSlot);

        // Renumber remaining slots to maintain sequence
        var remainingSlots = assignment.TimeSlots
            .Where(ts => ts.Id != slotId)
            .OrderBy(ts => ts.SlotNumber)
            .ToList();

        for (int i = 0; i < remainingSlots.Count; i++)
        {
            remainingSlots[i].SlotNumber = i + 1;
        }

        // Update assignment status
        assignment.UpdateStatus();
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }

    internal static void MapDeleteTimeSlot(this IEndpointRouteBuilder app) =>
        app.MapDelete("/{assignmentId:int}/slots/{slotId:int}", Handler)
            .WithSummary("Delete a time slot")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}