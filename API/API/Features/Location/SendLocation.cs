namespace API.Features.Location;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public class SendLocationValidator : AbstractValidator<SendLocationCommand>
{
    public SendLocationValidator()
    {
        RuleFor(x => x.BusAssignmentId).GreaterThan(0);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.SpeedKph).GreaterThanOrEqualTo(0).When(x => x.SpeedKph.HasValue);
    }
}

public static class SendLocation
{
    public static async Task<Results<ValidationProblem, NotFound, BadRequest<string>, Ok<LocationResponse>>> Handler(
        IValidator<SendLocationCommand> validator,
        SendLocationCommand command,
        ApplicationDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var assignment = await db.BusAssignments
            .Include(a => a.DriverProfile)
            .FirstOrDefaultAsync(a => a.Id == command.BusAssignmentId, ct);

        if (assignment == null)
            return TypedResults.NotFound();

        // Verify driver owns this assignment
        var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var isAdmin = httpContext.User.IsInRole(AppRoles.Admin);
        
        if (!isAdmin && assignment.DriverProfile.UserId != userId)
            return TypedResults.BadRequest("You are not authorized to report location for this assignment");

        // Check if assignment is active (InProgress or PartiallyCompleted)
        if (assignment.Status != AssignmentStatus.InProgress && 
            assignment.Status != AssignmentStatus.PartiallyCompleted &&
            assignment.Status != AssignmentStatus.Scheduled)
        {
            return TypedResults.BadRequest("Cannot report location for assignment that is not active");
        }

        var locationUpdate = new LocationUpdate
        {
            BusAssignmentId = command.BusAssignmentId,
            Latitude = command.Latitude,
            Longitude = command.Longitude,
            SpeedKph = command.SpeedKph,
            Heading = command.Heading,
            Accuracy = command.Accuracy,
            Timestamp = DateTime.UtcNow
        };

        db.LocationUpdates.Add(locationUpdate);
        
        // Clean up old locations (keep last 1000 per assignment)
        var oldLocations = await db.LocationUpdates
            .Where(l => l.BusAssignmentId == command.BusAssignmentId)
            .OrderByDescending(l => l.Timestamp)
            .Skip(1000)
            .ToListAsync(ct);
        
        db.LocationUpdates.RemoveRange(oldLocations);
        
        await db.SaveChangesAsync(ct);

        var response = new LocationResponse(
            locationUpdate.Id,
            locationUpdate.BusAssignmentId,
            locationUpdate.Latitude,
            locationUpdate.Longitude,
            locationUpdate.SpeedKph,
            locationUpdate.Heading,
            locationUpdate.Timestamp
        );

        return TypedResults.Ok(response);
    }

    internal static void MapSendLocation(this IEndpointRouteBuilder app) =>
        app.MapPost("/", Handler)
            .WithSummary("Send GPS location for a bus assignment")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Driver, AppRoles.Admin));
}