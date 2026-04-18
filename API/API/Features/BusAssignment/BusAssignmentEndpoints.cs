using API.Data;

namespace API.Features.BusAssignment;

public static class BusAssignmentEndpoints
{
    public static void MapBusAssignmentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/assignments")
            .WithTags("Bus Assignments")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));

        group.MapCreateBusAssignment();
        group.MapGetBusAssignment();
        group.MapGetBusAssignments();
        group.MapUpdateBusAssignment();
        group.MapCancelBusAssignment();
    }
}