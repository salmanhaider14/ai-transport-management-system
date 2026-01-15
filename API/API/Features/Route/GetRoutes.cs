namespace API.Features.Routes;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetRoutes
{
    public static async Task<Ok<List<Route>>> Handler(
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var routes = await db.Routes
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .ToListAsync(ct);

        return TypedResults.Ok(routes);
    }

    internal static void MapGetRoutes(this IEndpointRouteBuilder app) =>
        app.MapGet("/", Handler)
            .WithSummary("Get all routes");
}
