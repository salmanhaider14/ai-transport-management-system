namespace API.Features.Routes;

using API.Data;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record UpdateRouteCommand(
    string Name,
    bool IsActive
);

public class UpdateRouteValidator : AbstractValidator<UpdateRouteCommand>
{
    public UpdateRouteValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);
    }
}

public static class UpdateRoute
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, NoContent>
    > Handler(
        int id,
        IValidator<UpdateRouteCommand> validator,
        UpdateRouteCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var route = await db.Routes.FindAsync([id], ct);
        if (route is null)
            return TypedResults.NotFound();

        // Check for duplicate route name (excluding current route)
        var exists = await db.Routes
            .AnyAsync(r => r.Name == command.Name && r.Id != id, ct);

        if (exists)
            return TypedResults.Conflict($"Route name '{command.Name}' is already in use.");

        route.Name = command.Name;
        route.IsActive = command.IsActive;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapUpdateRoute(this IEndpointRouteBuilder app) =>
        app.MapPut("/{id:int}", Handler)
            .WithSummary("Update a route")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}