namespace API.Features.Driver;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

public static class GetAttendanceByDriver
{
    public static async Task<Results<Ok<List<DriverAttendanceResponse>>, NotFound, ForbidHttpResult>>
        Handler(
            int driverId,
            HttpContext httpContext,
            DateOnly? fromDate = null,
            DateOnly? toDate = null,
            ApplicationDbContext db = null!,
            CancellationToken ct = default)
    {
        // Get current user info
        var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var isAdmin = httpContext.User.IsInRole(AppRoles.Admin);

        // Check if driver exists
        var driver = await db.DriverProfiles
            .FirstOrDefaultAsync(d => d.Id == driverId, ct);
        
        if (driver == null)
            return TypedResults.NotFound();

        // Security check: Non-admin users can only access their own data
        if (!isAdmin)
        {
            if (string.IsNullOrEmpty(userId))
                return TypedResults.Forbid();

            var currentUserDriver = await db.DriverProfiles
                .FirstOrDefaultAsync(d => d.UserId == userId, ct);
            
            if (currentUserDriver == null || currentUserDriver.Id != driverId)
                return TypedResults.Forbid();
        }

        // Build query
        var query = db.DriverAttendances
            .Where(a => a.DriverProfileId == driverId);

        if (fromDate.HasValue)
            query = query.Where(a => a.Date >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(a => a.Date <= toDate.Value);

        var attendances = await query
            .OrderByDescending(a => a.Date)
            .ToListAsync(ct);

        var response = attendances.Select(a => new DriverAttendanceResponse(
            a.Id,
            a.DriverProfileId,
            a.Date,
            a.Status,
            a.CheckInTime,
            a.CheckOutTime,
            a.Remarks
        )).ToList();

        return TypedResults.Ok(response);
    }

    internal static void MapGetAttendanceByDriver(this IEndpointRouteBuilder app) =>
        app.MapGet("/driver/{driverId:int}", Handler)
            .WithSummary("Get attendance for a driver")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver));
}