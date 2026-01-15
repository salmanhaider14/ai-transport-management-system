namespace API.Features.Bus;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetBuses
{
    public static async Task<Ok<List<Bus>>> Handler(
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var buses = await db.Buses
            .AsNoTracking()
            .OrderBy(b => b.BusNumber)
            .ToListAsync(ct);

        return TypedResults.Ok(buses);
    }

    internal static void MapGetBuses(this IEndpointRouteBuilder app) =>
        app.MapGet("/", Handler)
            .WithSummary("Get all buses");
}
