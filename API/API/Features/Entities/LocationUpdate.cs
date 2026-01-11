namespace API.Features.Entities;

public class LocationUpdate
{
    public int Id { get; set; }
    public int BusAssignmentId { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime Timestamp { get; set; }

    public BusAssignment BusAssignment { get; set; } = null!;
}
