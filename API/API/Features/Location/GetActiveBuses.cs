namespace API.Features.Location;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetActiveBuses
{
    public static async Task<Ok<List<ActiveBusResponse>>> Handler(
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        
        // Get all assignments that are scheduled or in progress today
        var activeAssignments = await db.BusAssignments
            .Include(a => a.Bus)
            .Include(a => a.Route)
            .Include(a => a.DriverProfile)
            .Where(a => a.ServiceDate == today)
            .Where(a => a.Status == AssignmentStatus.Scheduled || 
                       a.Status == AssignmentStatus.InProgress ||
                       a.Status == AssignmentStatus.PartiallyCompleted)
            .ToListAsync(ct);

        var response = new List<ActiveBusResponse>();

        foreach (var assignment in activeAssignments)
        {
            // Get latest location for this assignment
            var latestLocation = await db.LocationUpdates
                .Where(l => l.BusAssignmentId == assignment.Id)
                .OrderByDescending(l => l.Timestamp)
                .FirstOrDefaultAsync(ct);

            var timeSinceLastUpdate = latestLocation != null 
                ? DateTime.UtcNow - latestLocation.Timestamp 
                : TimeSpan.FromMinutes(10);

            // Determine status display
            var statusDisplay = assignment.Status == AssignmentStatus.InProgress ? "On Trip" :
                               assignment.Status == AssignmentStatus.PartiallyCompleted ? "On Trip" :
                               assignment.Status == AssignmentStatus.Scheduled ? "Scheduled" : "Unknown";

            response.Add(new ActiveBusResponse(
                AssignmentId: assignment.Id,
                BusId: assignment.BusId,
                BusNumber: assignment.Bus.BusNumber,
                RouteId: assignment.RouteId,
                RouteName: assignment.Route.Name,
                Latitude: latestLocation?.Latitude ?? 0,
                Longitude: latestLocation?.Longitude ?? 0,
                SpeedKph: latestLocation?.SpeedKph,
                LastUpdate: latestLocation?.Timestamp ?? assignment.ServiceDate.ToDateTime(TimeOnly.MinValue),
                CurrentStatus: statusDisplay
            ));
        }

        return TypedResults.Ok(response);
    }

    internal static void MapGetActiveBuses(this IEndpointRouteBuilder app) =>
        app.MapGet("/active", Handler)
            .WithSummary("Get all active buses with current locations")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Student, AppRoles.Admin, AppRoles.Driver));
}