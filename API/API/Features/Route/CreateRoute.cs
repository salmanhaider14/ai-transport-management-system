namespace API.Features.Routes;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record CreateRouteStopDto(
    string Name,
    double Latitude,
    double Longitude,
    int StopOrder
);

public record CreateRouteCommand(
    string Name,
    List<CreateRouteStopDto> Stops
);

public class CreateRouteValidator : AbstractValidator<CreateRouteCommand>
{
    public CreateRouteValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Stops)
            .NotEmpty().WithMessage("Route must have at least one stop.")
            .Must(stops => stops.Select(s => s.StopOrder).Distinct().Count() == stops.Count)
            .WithMessage("Stop orders must be unique.")
            .Must(stops => stops.Min(s => s.StopOrder) == 1)
            .WithMessage("Stop order must start from 1.")
            .Must(stops => stops.Max(s => s.StopOrder) == stops.Count)
            .WithMessage("Stop orders must be sequential (1, 2, 3...).");

        RuleForEach(x => x.Stops).ChildRules(stop =>
        {
            stop.RuleFor(s => s.Name)
                .NotEmpty()
                .MaximumLength(100);
                
            stop.RuleFor(s => s.Latitude)
                .InclusiveBetween(-90, 90)
                .WithMessage("Latitude must be between -90 and 90.");
                
            stop.RuleFor(s => s.Longitude)
                .InclusiveBetween(-180, 180)
                .WithMessage("Longitude must be between -180 and 180.");
                
            stop.RuleFor(s => s.StopOrder)
                .GreaterThan(0);
        });
    }
}

public static class CreateRoute
{
    public static async Task<
        Results<ValidationProblem, Created<Route>>
    > Handler(
        IValidator<CreateRouteCommand> validator,
        CreateRouteCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = validator.Validate(command);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var route = new Route
        {
            Name = command.Name,
            IsActive = true
        };

        route.Stops = command.Stops
            .OrderBy(s => s.StopOrder)
            .Select(s => new RouteStop
            {
                Name = s.Name,
                Latitude = s.Latitude,
                Longitude = s.Longitude,
                StopOrder = s.StopOrder
            })
            .ToList();

        db.Routes.Add(route);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/routes/{route.Id}", route);
    }

    internal static void MapCreateRoute(this IEndpointRouteBuilder app) =>
        app.MapPost("/", Handler)
           .WithSummary("Create a route with stops")
           .RequireAuthorization( p => p.RequireRole(AppRoles.Admin));
}
