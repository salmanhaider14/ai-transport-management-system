using API.Data;

namespace API.Features.Dashboard;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/dashboard")
            .WithTags("Dashboard")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));

        group.MapGetDashboardStats();
    }
}