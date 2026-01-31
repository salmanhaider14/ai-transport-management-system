namespace API.Features.Driver;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public static class DeleteDriver
{
    public static async Task<
        Results<NoContent, NotFound, BadRequest<string>>
    > Handler(
        int id,
        ApplicationDbContext db,
        UserManager<IdentityUser> userManager,
        CancellationToken ct)
    {
        var driver = await db.DriverProfiles
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        
        if (driver == null)
            return TypedResults.NotFound();

        // Check if driver has active assignments
        var hasActiveAssignments = await db.BusAssignments
            .AnyAsync(ba => ba.DriverProfileId == id && 
                            ba.Status == AssignmentStatus.Scheduled, ct);
        
        if (hasActiveAssignments)
            return TypedResults.BadRequest(
                "Cannot deactivate driver with active assignments. Reassign or cancel assignments first.");

        // Soft delete driver profile
        driver.IsActive = false;

        // Also deactivate the user account
        if (driver.User != null)
        {
            driver.User.LockoutEnd = DateTimeOffset.MaxValue; // Permanent lockout
            await userManager.UpdateAsync(driver.User);
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapDeleteDriver(this IEndpointRouteBuilder app) =>
        app.MapDelete("/{id:int}", Handler)
            .WithSummary("Deactivate a driver")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}