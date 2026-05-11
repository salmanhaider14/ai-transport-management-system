namespace API.Features.Location;

public static class LocationEndpoints
{
    public static void MapLocationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/locations")
            .WithTags("Location Tracking");

        group.MapSendLocation();
        group.MapGetActiveBuses();
        group.MapGetBusLocation();
        group.MapGetLocationHistory();
    }
}