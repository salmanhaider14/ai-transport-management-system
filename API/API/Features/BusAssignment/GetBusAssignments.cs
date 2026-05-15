using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace API.Features.BusAssignment;

public static class GetBusAssignments
{
    public static async Task<Ok<List<BusAssignmentSummaryResponse>>> Handler(
        ApplicationDbContext db,
        DateOnly? serviceDate = null,
        int? busId = null,
        int? driverId = null,
        int? routeId = null,
        AssignmentStatus? status = null,
        CancellationToken ct = default)
    {
        var query = db.BusAssignments
            .Include(a => a.Bus)
            .Include(a => a.Route)
            .Include(a => a.DriverProfile)
            .ThenInclude(d => d.User)
            .Include(a => a.TimeSlots)
            .AsQueryable();

        if (serviceDate.HasValue)
            query = query.Where(a => a.ServiceDate == serviceDate.Value);

        if (busId.HasValue)
            query = query.Where(a => a.BusId == busId.Value);

        if (driverId.HasValue)
            query = query.Where(a => a.DriverProfileId == driverId.Value);

        if (routeId.HasValue)
            query = query.Where(a => a.RouteId == routeId.Value);

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        // Get all assignments first
        var assignments = await query.ToListAsync(ct);

        // Then sort in memory (can't sort by computed properties in SQL)
        assignments = assignments
            .OrderByDescending(a => a.ServiceDate)
            .ThenBy(a => a.FirstSlotStart ?? TimeOnly.MaxValue) // Handle null FirstSlotStart
            .ToList();

        var response = assignments.Select(a => new BusAssignmentSummaryResponse(
            a.Id,
            a.BusId,
            a.Bus.BusNumber,
            a.RouteId,
            a.Route.Name,
            a.DriverProfileId,
            a.DriverProfile.User?.UserName ?? "Unknown",
            a.ServiceDate,
            a.Status,
            a.FirstSlotStart,
            a.LastSlotEnd,
            a.TotalSlots,
            a.CompletedSlots
        )).ToList();

        return TypedResults.Ok(response);
    }

    internal static void MapGetBusAssignments(this IEndpointRouteBuilder app) =>
        app.MapGet("/", Handler)
            .WithSummary("Get bus assignments with filters")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin, AppRoles.Driver, AppRoles.Student));
}
