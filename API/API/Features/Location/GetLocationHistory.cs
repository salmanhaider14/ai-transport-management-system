using API.Features.Entities;

namespace API.Features.Location;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetLocationHistory
{
    public static async Task<Results<Ok<List<LocationResponse>>, NotFound>> Handler(
        int assignmentId,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 100,
        ApplicationDbContext db = null!,
        CancellationToken ct = default)
    {
        var assignmentExists = await db.BusAssignments.AnyAsync(a => a.Id == assignmentId, ct);
        if (!assignmentExists)
            return TypedResults.NotFound();

        var query = db.LocationUpdates
            .Where(l => l.BusAssignmentId == assignmentId)
            .OrderByDescending(l => l.Timestamp);

        if (from.HasValue)
            query = (IOrderedQueryable<LocationUpdate>)query.Where(l => l.Timestamp >= from.Value);
        if (to.HasValue)
            query = (IOrderedQueryable<LocationUpdate>)query.Where(l => l.Timestamp <= to.Value);

        var locations = await query
            .Take(limit)
            .OrderBy(l => l.Timestamp)
            .ToListAsync(ct);

        var response = locations.Select(l => new LocationResponse(
            l.Id,
            l.BusAssignmentId,
            l.Latitude,
            l.Longitude,
            l.SpeedKph,
            l.Heading,
            l.Timestamp
        )).ToList();

        return TypedResults.Ok(response);
    }

    internal static void MapGetLocationHistory(this IEndpointRouteBuilder app) =>
        app.MapGet("/{assignmentId:int}/history", Handler)
            .WithSummary("Get location history for a bus assignment")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));
}