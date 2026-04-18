namespace API.Features.BusAssignment;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetTimeSlotsByAssignment
{
    public static async Task<Results<Ok<List<TimeSlotResponse>>, NotFound>> Handler(
        int assignmentId,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var assignmentExists = await db.BusAssignments.AnyAsync(a => a.Id == assignmentId, ct);
        if (!assignmentExists)
            return TypedResults.NotFound();

        var timeSlots = await db.TimeSlots
            .Where(ts => ts.BusAssignmentId == assignmentId)
            .OrderBy(ts => ts.SlotNumber)
            .ToListAsync(ct);

        var response = timeSlots.Select(ts => new TimeSlotResponse(
            ts.Id,
            ts.BusAssignmentId,
            ts.SlotNumber,
            ts.StartTime,
            ts.EndTime,
            ts.Status,
            ts.ActualStartTime,
            ts.ActualEndTime,
            ts.Notes
        )).ToList();

        return TypedResults.Ok(response);
    }

    internal static void MapGetTimeSlotsByAssignment(this IEndpointRouteBuilder app) =>
        app.MapGet("/{assignmentId:int}/slots", Handler)
            .WithSummary("Get all time slots for an assignment")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));
}