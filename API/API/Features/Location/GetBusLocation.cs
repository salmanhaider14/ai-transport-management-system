namespace API.Features.Location;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetBusLocation
{
    public static async Task<Results<Ok<BusLocationResponse>, NotFound>> Handler(
        int assignmentId,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var assignmentExists = await db.BusAssignments.AnyAsync(a => a.Id == assignmentId, ct);
        if (!assignmentExists)
            return TypedResults.NotFound();

        var latestLocation = await db.LocationUpdates
            .Where(l => l.BusAssignmentId == assignmentId)
            .OrderByDescending(l => l.Timestamp)
            .FirstOrDefaultAsync(ct);

        if (latestLocation == null)
            return TypedResults.NotFound();

        var response = new BusLocationResponse(
            Latitude: latestLocation.Latitude,
            Longitude: latestLocation.Longitude,
            SpeedKph: latestLocation.SpeedKph,
            LastUpdate: latestLocation.Timestamp,
            Status: "Active"
        );

        return TypedResults.Ok(response);
    }

    internal static void MapGetBusLocation(this IEndpointRouteBuilder app) =>
        app.MapGet("/{assignmentId:int}/location", Handler)
            .WithSummary("Get latest location for a specific bus")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Student, AppRoles.Admin, AppRoles.Driver));
}