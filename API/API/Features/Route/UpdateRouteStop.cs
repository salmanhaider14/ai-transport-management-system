namespace API.Features.Route;

using API.Data;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record UpdateRouteStopCommand(
    string Name,
    double Latitude,
    double Longitude,
    int StopOrder
);

public class UpdateRouteStopValidator : AbstractValidator<UpdateRouteStopCommand>
{
    public UpdateRouteStopValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);
            
        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90)
            .WithMessage("Latitude must be between -90 and 90.");
            
        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .WithMessage("Longitude must be between -180 and 180.");
            
        RuleFor(x => x.StopOrder)
            .GreaterThan(0);
    }
}

public static class UpdateRouteStop
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, NoContent>
    > Handler(
        int routeId,
        int stopId,
        IValidator<UpdateRouteStopCommand> validator,
        UpdateRouteStopCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var routeStop = await db.RouteStops
            .FirstOrDefaultAsync(rs => rs.Id == stopId && rs.RouteId == routeId, ct);
            
        if (routeStop is null)
            return TypedResults.NotFound();

        // Check if stop order is already taken by another stop in same route
        var orderExists = await db.RouteStops
            .AnyAsync(rs => 
                rs.RouteId == routeId && 
                rs.StopOrder == command.StopOrder && 
                rs.Id != stopId, ct);

        if (orderExists)
            return TypedResults.Conflict($"Stop order {command.StopOrder} is already taken in this route.");

        routeStop.Name = command.Name;
        routeStop.Latitude = command.Latitude;
        routeStop.Longitude = command.Longitude;
        routeStop.StopOrder = command.StopOrder;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapUpdateRouteStop(this IEndpointRouteBuilder app) =>
        app.MapPut("/{routeId:int}/stops/{stopId:int}", Handler)
            .WithSummary("Update a route stop")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}