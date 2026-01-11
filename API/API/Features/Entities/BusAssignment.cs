namespace API.Features.Entities;

public enum AssignmentStatus
{
    Scheduled,
    InProgress,
    Completed,
    Cancelled
}


public class BusAssignment
{
    public int Id { get; set; }

    public int BusId { get; set; }
    public int RouteId { get; set; }
    public int DriverProfileId { get; set; }

    public DateOnly ServiceDate { get; set; }

    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public AssignmentStatus Status { get; set; } = AssignmentStatus.Scheduled;

    public Bus Bus { get; set; } = null!;
    public Route Route { get; set; } = null!;
    public DriverProfile DriverProfile { get; set; } = null!;
}

