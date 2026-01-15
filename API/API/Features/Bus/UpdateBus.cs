namespace API.Features.Bus;

using API.Data;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record UpdateBusCommand(
    string BusNumber,
    int Capacity,
    bool IsActive
);

public class UpdateBusValidator : AbstractValidator<UpdateBusCommand>
{
    public UpdateBusValidator()
    {
        RuleFor(x => x.BusNumber).NotEmpty();
        RuleFor(x => x.Capacity).GreaterThan(0);
    }
}

public static class UpdateBus
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, NoContent>
    > Handler(
        int Id,
        IValidator<UpdateBusCommand> validator,
        UpdateBusCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var bus = await db.Buses.FindAsync([Id], ct);
        if (bus is null)
            return TypedResults.NotFound();

        var exists = await db.Buses
            .AnyAsync(b =>
                b.BusNumber == command.BusNumber &&
                b.Id != Id, ct);

        if (exists) return TypedResults.Conflict($"Bus number '{command.BusNumber}' is already in use.");

        bus.BusNumber = command.BusNumber;
        bus.Capacity = command.Capacity;
        bus.IsActive = command.IsActive;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapUpdateBus(this IEndpointRouteBuilder app) =>
        app.MapPut("/{id:int}", Handler)
           .WithSummary("Update a bus")
           .RequireAuthorization((p => p.RequireRole(AppRoles.Admin)));
}
