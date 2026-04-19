using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace API.Features.BusAssignment;
public static class GetBusAssignment
{
    public static async Task<Results<Ok<BusAssignmentResponse>, NotFound>> Handler(
        int id,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var assignment = await db.BusAssignments
            .Include(a => a.Bus)
            .Include(a => a.Route)
            .Include(a => a.DriverProfile)
            .ThenInclude(d => d.User)
            .Include(a => a.TimeSlots)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (assignment == null)
            return TypedResults.NotFound();

        var response = new BusAssignmentResponse(
            assignment.Id,
            assignment.BusId,
            assignment.Bus.BusNumber,
            assignment.RouteId,
            assignment.Route.Name,
            assignment.DriverProfileId,
            assignment.DriverProfile.User?.UserName ?? "Unknown",
            assignment.ServiceDate,
            assignment.Status,
            assignment.FirstSlotStart,
            assignment.LastSlotEnd,
            assignment.TotalSlots,
            assignment.CompletedSlots,
            assignment.TimeSlots.Select(ts => new TimeSlotResponse(
                ts.Id,                     // 1st: Id ✓
                ts.SlotNumber,             // 2nd: SlotNumber ✓
                ts.BusAssignmentId,        // 3rd: BusAssignmentId ✓
                ts.StartTime,              // 4th: StartTime ✓
                ts.EndTime,                // 5th: EndTime ✓
                ts.Status,                 // 6th: Status ✓
                ts.ActualStartTime,        // 7th: ActualStartTime ✓
                ts.ActualEndTime,          // 8th: ActualEndTime ✓
                ts.Notes                   // 9th: Notes ✓
            )).ToList()
        );

        return TypedResults.Ok(response);
    }

    internal static void MapGetBusAssignment(this IEndpointRouteBuilder app) =>
        app.MapGet("/{id:int}", Handler)
            .WithSummary("Get a bus assignment by ID")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));
}