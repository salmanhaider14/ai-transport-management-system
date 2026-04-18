namespace API.Features.BusAssignment;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetTimeSlot
{
    public static async Task<Results<Ok<TimeSlotDetailResponse>, NotFound>> Handler(
        int assignmentId,
        int slotId,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var timeSlot = await db.TimeSlots
            .Include(ts => ts.BusAssignment)
                .ThenInclude(a => a.Bus)
            .Include(ts => ts.BusAssignment)
                .ThenInclude(a => a.Route)
            .Include(ts => ts.BusAssignment)
                .ThenInclude(a => a.DriverProfile)
                    .ThenInclude(d => d.User)
            .FirstOrDefaultAsync(ts => ts.Id == slotId && ts.BusAssignmentId == assignmentId, ct);

        if (timeSlot == null)
            return TypedResults.NotFound();

        var response = new TimeSlotDetailResponse(
            timeSlot.Id,
            timeSlot.BusAssignmentId,
            timeSlot.BusAssignment.ServiceDate,
            timeSlot.BusAssignment.Bus.BusNumber,
            timeSlot.BusAssignment.Route.Name,
            timeSlot.BusAssignment.DriverProfile.User?.UserName ?? "Unknown",
            timeSlot.SlotNumber,
            timeSlot.StartTime,
            timeSlot.EndTime,
            timeSlot.Status,
            timeSlot.ActualStartTime,
            timeSlot.ActualEndTime,
            timeSlot.Notes,
            timeSlot.ActualStartTime.HasValue && timeSlot.ActualEndTime.HasValue
                ? (timeSlot.ActualEndTime.Value - timeSlot.ActualStartTime.Value)
                : null
        );

        return TypedResults.Ok(response);
    }

    internal static void MapGetTimeSlot(this IEndpointRouteBuilder app) =>
        app.MapGet("/{assignmentId:int}/slots/{slotId:int}", Handler)
            .WithSummary("Get a time slot by ID")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));
}

public record TimeSlotDetailResponse(
    int Id,
    int BusAssignmentId,
    DateOnly ServiceDate,
    string BusNumber,
    string RouteName,
    string DriverName,
    int SlotNumber,
    TimeOnly StartTime,
    TimeOnly EndTime,
    TimeSlotStatus Status,
    TimeOnly? ActualStartTime,
    TimeOnly? ActualEndTime,
    string? Notes,
    TimeSpan? ActualDuration
);