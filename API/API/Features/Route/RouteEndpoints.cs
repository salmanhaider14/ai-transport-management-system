using API.Features.Route;
using API.Features.RouteStops;

namespace API.Features.Routes;

public static class RouteEndpoints
{
    public static void MapRouteEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/routes")
            .WithTags("Routes");

        group.MapCreateRoute();
        group.MapGetRoutes();
        group.MapGetRoute();
        group.MapUpdateRoute();
        group.MapDeleteRoute();
        group.MapUpdateRouteStop();
        group.MapAddRouteStop();
        group.MapDeleteRouteStop();
    }
}
