namespace API.Features.Bus;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetBus
{
    public static async Task<
        Results<Ok<Bus>, NotFound>
    > Handler(
        int id,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var bus = await db.Buses
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, ct);

        return bus is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(bus);
    }

    internal static void MapGetBus(this IEndpointRouteBuilder app) =>
        app.MapGet("/{id:int}", Handler)
            .WithSummary("Get a bus by id");
}
