namespace API.Features.Driver;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetDriverProfiles
{
    public static async Task<Ok<List<DriverProfileResponse>>> Handler(
        ApplicationDbContext db,
        bool? isActive = null,
        CancellationToken ct = default)
    {
        var query = db.DriverProfiles.AsQueryable();

        if (isActive.HasValue)
            query = query.Where(d => d.IsActive == isActive.Value);

        var drivers = await query.ToListAsync(ct);

        var response = drivers.Select(d => new DriverProfileResponse(
            d.Id,
            d.UserId,
            d.LicenseNumber,
            d.PhoneNumber,
            d.Address,
            d.NationalId,
            d.EmergencyContact,
            d.DateOfJoining,
            d.IsActive
        )).ToList();

        return TypedResults.Ok(response);
    }

    internal static void MapGetDriverProfiles(this IEndpointRouteBuilder app) =>
        app.MapGet("/", Handler)
            .WithSummary("Get all driver profiles")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}
