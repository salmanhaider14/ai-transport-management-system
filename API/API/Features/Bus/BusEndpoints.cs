using API.Data;

namespace API.Features.Bus;

public static class BusEndpoints
{
    public static void MapBusEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/buses")
            .WithTags("Buses");

        group.MapCreateBus();
        group.MapGetBuses();
        group.MapGetBus();
        group.MapUpdateBus();
        group.MapDeleteBus();
    }
}