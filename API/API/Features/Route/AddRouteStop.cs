namespace API.Features.RouteStops;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record AddRouteStopCommand(
    string Name,
    double Latitude,
    double Longitude,
    int StopOrder
);

public class AddRouteStopValidator : AbstractValidator<AddRouteStopCommand>
{
    public AddRouteStopValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);
            
        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90);
            
        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180);
            
        RuleFor(x => x.StopOrder)
            .GreaterThan(0);
    }
}

public static class AddRouteStop
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, Created<RouteStop>>
    > Handler(
        int routeId,
        IValidator<AddRouteStopCommand> validator,
        AddRouteStopCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var route = await db.Routes.FindAsync([routeId], ct);
        if (route is null)
            return TypedResults.NotFound();

        // Check if stop order is already taken
        var orderExists = await db.RouteStops
            .AnyAsync(rs => rs.RouteId == routeId && rs.StopOrder == command.StopOrder, ct);

        if (orderExists)
            return TypedResults.Conflict($"Stop order {command.StopOrder} is already taken in this route.");

        var routeStop = new RouteStop
        {
            RouteId = routeId,
            Name = command.Name,
            Latitude = command.Latitude,
            Longitude = command.Longitude,
            StopOrder = command.StopOrder
        };

        db.RouteStops.Add(routeStop);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/routes/{routeId}/stops/{routeStop.Id}", routeStop);
    }

    internal static void MapAddRouteStop(this IEndpointRouteBuilder app) =>
        app.MapPost("/{routeId:int}/stops", Handler)
            .WithSummary("Add a stop to a route")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}