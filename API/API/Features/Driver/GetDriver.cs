namespace API.Features.Driver;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetDriver
{
    public static async Task<Results<Ok<DriverDetailResponse>, NotFound>> Handler(
        int id,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var driver = await db.DriverProfiles
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        
        if (driver == null)
            return TypedResults.NotFound();
        if (driver == null || !driver.IsActive) // Add IsActive check
            return TypedResults.NotFound();

        var response = new DriverDetailResponse(
            driver.Id,
            driver.UserId,
            driver.User?.Email ?? string.Empty,
            driver.User?.UserName ?? string.Empty,
            driver.LicenseNumber,
            driver.PhoneNumber,
            driver.Address,
            driver.NationalId,
            driver.EmergencyContact,
            driver.DateOfJoining,
            driver.IsActive,
            driver.User?.LockoutEnd > DateTimeOffset.UtcNow // IsLockedOut
        );

        return TypedResults.Ok(response);
    }
    internal static void MapGetDriver(this IEndpointRouteBuilder app) =>
        app.MapGet("/{id:int}", Handler)
            .WithSummary("Get driver profile details")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin,AppRoles.Driver));
}

