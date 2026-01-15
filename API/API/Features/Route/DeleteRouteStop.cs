namespace API.Features.Route;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class DeleteRouteStop
{
    public static async Task<
        Results<NoContent, NotFound, BadRequest<string>>
    > Handler(
        int routeId,
        int stopId,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var routeStop = await db.RouteStops
            .FirstOrDefaultAsync(rs => rs.Id == stopId && rs.RouteId == routeId, ct);
            
        if (routeStop is null)
            return TypedResults.NotFound();

        // Check if this is the last stop in the route
        var stopCount = await db.RouteStops
            .CountAsync(rs => rs.RouteId == routeId, ct);
            
        if (stopCount <= 1)
            return TypedResults.BadRequest("Cannot delete the last stop of a route.");

        // Check if any bus assignments reference this route
        var hasAssignments = await db.BusAssignments
            .AnyAsync(ba => ba.RouteId == routeId, ct);
            
        if (hasAssignments)
            return TypedResults.BadRequest("Cannot delete stops from a route that has active assignments.");

        db.RouteStops.Remove(routeStop);
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }

    internal static void MapDeleteRouteStop(this IEndpointRouteBuilder app) =>
        app.MapDelete("/{routeId:int}/stops/{stopId:int}", Handler)
            .WithSummary("Delete a route stop")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}