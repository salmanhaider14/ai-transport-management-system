using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace API.Features.BusAssignment;

public static class CancelBusAssignment
{
    public static async Task<
        Results<NoContent, NotFound, BadRequest<string>>
    > Handler(
        int id,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var assignment = await db.BusAssignments
            .Include(a => a.TimeSlots)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (assignment == null)
            return TypedResults.NotFound();

        // Cannot cancel completed assignments
        if (assignment.Status == AssignmentStatus.Completed)
            return TypedResults.BadRequest("Cannot cancel a completed assignment.");

        // Check if any time slot is in progress
        if (assignment.TimeSlots.Any(ts => ts.Status == TimeSlotStatus.InProgress))
            return TypedResults.BadRequest("Cannot cancel assignment with time slots in progress.");

        // Soft cancel: Mark assignment as cancelled and cancel all time slots
        assignment.Status = AssignmentStatus.Cancelled;
        
        foreach (var timeSlot in assignment.TimeSlots)
        {
            if (timeSlot.Status == TimeSlotStatus.Scheduled)
                timeSlot.Status = TimeSlotStatus.Cancelled;
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapCancelBusAssignment(this IEndpointRouteBuilder app) =>
        app.MapDelete("/{id:int}", Handler)
            .WithSummary("Cancel a bus assignment")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}