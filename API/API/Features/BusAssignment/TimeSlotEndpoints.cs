using API.Data;
using API.Features.BusAssignment;


public static class TimeSlotEndpoints
{
    public static void MapTimeSlotEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/assignments")
            .WithTags("Time Slots")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));

        // Time slot management under assignments
        group.MapAddTimeSlot();                     // POST /assignments/{id}/slots
        group.MapGetTimeSlotsByAssignment();        // GET /assignments/{id}/slots
        group.MapGetTimeSlot();                     // GET /assignments/{id}/slots/{id}
        group.MapUpdateTimeSlot();                  // PUT /assignments/{id}/slots/{id}
        group.MapDeleteTimeSlot();                  // DELETE /assignments/{id}/slots/{id}
    }
}