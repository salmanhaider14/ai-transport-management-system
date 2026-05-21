using API.Features.Entities;

namespace API.Features.Location;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetBusLocation
{
 public static async Task<Results<Ok<BusLocationResponse>, NotFound>> Handler(
    int assignmentId,
    ApplicationDbContext db,
    CancellationToken ct)
{
    var assignment = await db.BusAssignments
        .Include(a => a.Route)
        .Include(a => a.TimeSlots)
        .FirstOrDefaultAsync(a => a.Id == assignmentId, ct);
    
    if (assignment == null)
        return TypedResults.NotFound();

    var latestLocation = await db.LocationUpdates
        .Where(l => l.BusAssignmentId == assignmentId)
        .OrderByDescending(l => l.Timestamp)
        .FirstOrDefaultAsync(ct);

    if (latestLocation == null)
        return TypedResults.NotFound();

    // Calculate ETA
    var eta = await CalculateEta(assignment, latestLocation, db, ct);

    var response = new BusLocationResponse(
        Latitude: latestLocation.Latitude,
        Longitude: latestLocation.Longitude,
        SpeedKph: latestLocation.SpeedKph,
        LastUpdate: latestLocation.Timestamp,
        Status: "Active",
        EtaMinutes: eta?.EtaMinutes,
        EtaText: eta?.EtaText
    );

    return TypedResults.Ok(response);
}

private static async Task<EtaData?> CalculateEta(
    Entities.BusAssignment assignment, 
    LocationUpdate currentLocation, 
    ApplicationDbContext db,
    CancellationToken ct)
{
    // Get current time in PKT
    var now = TimeOnly.FromDateTime(DateTime.UtcNow.AddHours(5));
    
    // Find current or next time slot
    var currentSlot = assignment.TimeSlots
        .FirstOrDefault(s => s.StartTime <= now && s.EndTime >= now);
    
    if (currentSlot == null)
    {
        currentSlot = assignment.TimeSlots
            .FirstOrDefault(s => s.StartTime > now);
        
        if (currentSlot == null)
            return null;
    }
    
    // Get route stops
    var stops = await db.RouteStops
        .Where(s => s.RouteId == assignment.RouteId)
        .OrderBy(s => s.StopOrder)
        .ToListAsync(ct);
    
    if (stops.Count < 2)
        return null;
    
    // Find closest stop to current location
    var currentStop = stops.OrderBy(s => 
        CalculateDistance(
            currentLocation.Latitude, currentLocation.Longitude,
            s.Latitude, s.Longitude
        )).First();
    
    // Last stop is destination
    var destinationStop = stops.Last();
    
    // Calculate remaining distance
    var remainingDistance = CalculateDistance(
        currentLocation.Latitude, currentLocation.Longitude,
        destinationStop.Latitude, destinationStop.Longitude
    );
    
    // Use current speed or default 35 km/h
    var speedKph = currentLocation.SpeedKph ?? 35;
    
    if (speedKph < 5) speedKph = 35; // If stopped, use average
    
    // Calculate ETA in minutes
    var etaMinutes = (remainingDistance / speedKph) * 60;
    
    // Cap by slot end time
    var minutesRemainingInSlot = (currentSlot.EndTime - now).TotalMinutes;
    if (etaMinutes > minutesRemainingInSlot && minutesRemainingInSlot > 0)
        etaMinutes = minutesRemainingInSlot;
    
    if (etaMinutes < 1) etaMinutes = 1;
    
    return new EtaData
    {
        EtaMinutes = Math.Round(etaMinutes, 0),
        EtaText = FormatEtaText(Math.Round(etaMinutes, 0))
    };
}

private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
{
    var R = 6371;
    var dLat = ToRadians(lat2 - lat1);
    var dLon = ToRadians(lon2 - lon1);
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
    var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    return R * c;
}

private static double ToRadians(double deg) => deg * Math.PI / 180;

private static string FormatEtaText(double minutes)
{
    if (minutes < 1) return "Arriving now";
    if (minutes < 60) return $"{Math.Round(minutes)} min";
    var hours = (int)minutes / 60;
    var mins = (int)minutes % 60;
    return mins > 0 ? $"{hours}h {mins}m" : $"{hours}h";
}

private class EtaData
{
    public double EtaMinutes { get; set; }
    public string EtaText { get; set; } = "";
}
    internal static void MapGetBusLocation(this IEndpointRouteBuilder app) =>
        app.MapGet("/{assignmentId:int}/location", Handler)
            .WithSummary("Get latest location for a specific bus")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Student, AppRoles.Admin, AppRoles.Driver));
}