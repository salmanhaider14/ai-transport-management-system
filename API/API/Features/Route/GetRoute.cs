namespace API.Features.Routes;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetRoute
{
    public static async Task<
        Results<Ok<Route>, NotFound>
    > Handler(
        int id,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var route = await db.Routes
            .Include(r => r.Stops.OrderBy(s => s.StopOrder))
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        return route is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(route);
    }

    internal static void MapGetRoute(this IEndpointRouteBuilder app) =>
        app.MapGet("/{id:int}", Handler)
            .WithSummary("Get a route with stops");
}
