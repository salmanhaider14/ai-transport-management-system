
using API.Data;

namespace API.Features.Driver;

public static class DriverEndpoints
{
    public static void MapDriverEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/drivers")
            .WithTags("Drivers")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
        
        group.MapCreateDriverProfile();
        group.MapUpdateDriverProfile();
        group.MapDeleteDriver();
        group.MapGetDriver();
        group.MapGetDriverProfiles();
        
        group = app.MapGroup("/attendance")
            .WithTags("Driver Attendance")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));

        group.MapMarkAttendance();
        group.MapUpdateAttendance();
        group.MapGetAttendanceByDriver();

        
    }
}