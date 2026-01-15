namespace API.Features.Entities;

public class Route
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    
    public ICollection<RouteStop> Stops { get; set; } = new List<RouteStop>();
    public ICollection<BusAssignment> BusAssignments { get; set; } = new List<BusAssignment>();
}
