namespace API.Features.Entities;

public class RouteStop
{
    public int Id { get; set; }
    public int RouteId { get; set; }
    public string Name { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int StopOrder { get; set; }

    public Route Route { get; set; } = null!;
}
