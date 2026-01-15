namespace API.Features.Bus;

using Data;
using Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record CreateBusCommand(string BusNumber, int Capacity);

public class CreateBusValidator : AbstractValidator<CreateBusCommand>
{
    public CreateBusValidator()
    {
        RuleFor(x => x.BusNumber)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(x => x.Capacity)
            .GreaterThan(0)
            .LessThanOrEqualTo(100);
    }
}

public static class CreateBus
{
    public static async Task<
        Results<ValidationProblem, Conflict<string>, Created<Bus>>
    > Handler(
        IValidator<CreateBusCommand> validator,
        CreateBusCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var exists = await db.Buses
            .AnyAsync(b => b.BusNumber == command.BusNumber, ct);

        if (exists)
            return TypedResults.Conflict($"Bus number '{command.BusNumber}' already exists.");

        var bus = new Bus
        {
            BusNumber = command.BusNumber,
            Capacity = command.Capacity,
            IsActive = true
        };

        db.Buses.Add(bus);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/buses/{bus.Id}", bus);
    }

    internal static void MapCreateBus(this IEndpointRouteBuilder app) =>
        app.MapPost("/", Handler)
            .WithSummary("Create a new bus")
            .RequireAuthorization()
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));  /*
                .Produces<Bus>(StatusCodes.Status201Created)
                .ProducesValidationProblem()
                .Produces(StatusCodes.Status409Conflict);*/
}
