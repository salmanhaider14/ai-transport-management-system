using API.Features.Entities;

namespace API.Features.Routes;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class DeleteRoute
{
    public static async Task<
        Results<NoContent, NotFound, BadRequest<string>>
    > Handler(
        int id,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var route = await db.Routes
            .Include(r => r.Stops)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
            
        if (route is null)
            return TypedResults.NotFound();

        // Check if route has any active bus assignments
        var hasActiveAssignments = await db.BusAssignments
            .AnyAsync(ba => 
                ba.RouteId == id && 
                ba.Status != AssignmentStatus.Completed && 
                ba.Status != AssignmentStatus.Cancelled, ct);
            
        if (hasActiveAssignments)
            return TypedResults.BadRequest(
                "Cannot delete route with active bus assignments. Cancel assignments first.");

        // Check if route has any historical assignments (for soft delete consideration)
        var hasAnyAssignments = await db.BusAssignments
            .AnyAsync(ba => ba.RouteId == id, ct);
            
        if (hasAnyAssignments)
        {
            // Soft delete instead of hard delete
            route.IsActive = false;
            
            // Also soft delete all stops if needed
            foreach (var stop in route.Stops)
            {
                // If you add IsActive to RouteStop
                // stop.IsActive = false;
                // stop.DeletedAt = DateTime.UtcNow;
            }
        }
        else
        {
            // No assignments at all, can hard delete
            db.Routes.Remove(route);
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapDeleteRoute(this IEndpointRouteBuilder app) =>
        app.MapDelete("/{id:int}", Handler)
            .WithSummary("Delete a route")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}