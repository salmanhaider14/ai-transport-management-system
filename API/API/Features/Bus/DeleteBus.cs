namespace API.Features.Bus;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;

public static class DeleteBus
{
    public static async Task<
        Results<NoContent, NotFound>
    > Handler(
        int id,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var bus = await db.Buses.FindAsync([id], ct);
        if (bus is null)
            return TypedResults.NotFound();

        bus.IsActive = false;
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }

    internal static void MapDeleteBus(this IEndpointRouteBuilder app) =>
        app.MapDelete("/{id:int}", Handler)
            .WithSummary("Deactivate a bus");
}
