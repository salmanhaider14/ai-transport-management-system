namespace API.Features.Entities;

public enum AssignmentStatus
{
    Draft,
    Scheduled,
    InProgress,
    PartiallyCompleted,
    Completed,
    Cancelled
}

public enum TimeSlotStatus
{
    Scheduled,
    InProgress,
    Completed,
    Skipped,
    Cancelled
}

public class BusAssignment
{
    public int Id { get; set; }
    public int BusId { get; set; }
    public int RouteId { get; set; }
    public int DriverProfileId { get; set; }
    
    public DateOnly ServiceDate { get; set; }
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Draft;
    
    // Multiple time slots for same day
    public ICollection<TimeSlot> TimeSlots { get; set; } = new List<TimeSlot>();
    
    // Calculated properties (optional, for convenience)
    public TimeOnly? FirstSlotStart => TimeSlots.MinBy(t => t.StartTime)?.StartTime;
    public TimeOnly? LastSlotEnd => TimeSlots.MaxBy(t => t.EndTime)?.EndTime;
    public int TotalSlots => TimeSlots.Count;
    public int CompletedSlots => TimeSlots.Count(t => t.Status == TimeSlotStatus.Completed);
    
    // Navigation properties
    public Bus Bus { get; set; } = null!;
    public Route Route { get; set; } = null!;
    public DriverProfile DriverProfile { get; set; } = null!;
    public ICollection<LocationUpdate> LocationUpdates { get; set; } = new List<LocationUpdate>();
    
    public void UpdateStatus()
    {
        if (!TimeSlots.Any())
        {
            Status = AssignmentStatus.Draft;
            return;
        }
            
        var allCancelled = TimeSlots.All(t => t.Status == TimeSlotStatus.Cancelled);
        var allCompleted = TimeSlots.All(t => t.Status == TimeSlotStatus.Completed);
        var anyInProgress = TimeSlots.Any(t => t.Status == TimeSlotStatus.InProgress);
        var anyCompleted = TimeSlots.Any(t => t.Status == TimeSlotStatus.Completed);
        var anyScheduled = TimeSlots.Any(t => t.Status == TimeSlotStatus.Scheduled);
            
        if (allCancelled)
        {
            Status = AssignmentStatus.Cancelled;
        }
        else if (allCompleted)
        {
            Status = AssignmentStatus.Completed;
        }
        else if (anyInProgress)
        {
            Status = AssignmentStatus.InProgress;
        }
        else if (anyCompleted && anyScheduled)
        {
            Status = AssignmentStatus.PartiallyCompleted;
        }
        else if (TimeSlots.All(t => t.Status == TimeSlotStatus.Scheduled))
        {
            Status = AssignmentStatus.Scheduled;
        }
        else
        {
            Status = AssignmentStatus.Draft;
        }
    }
}

public class TimeSlot
{
    public int Id { get; set; }
    public int BusAssignmentId { get; set; }
    
    // Slot sequence (1st, 2nd, 3rd trip of the day)
    public int SlotNumber { get; set; }
    
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public TimeSlotStatus Status { get; set; } = TimeSlotStatus.Scheduled;
    
    // Actual times (recorded when trip happens)
    public TimeOnly? ActualStartTime { get; set; }
    public TimeOnly? ActualEndTime { get; set; }
    
    public string? Notes { get; set; }
    
    // Navigation
    public BusAssignment BusAssignment { get; set; } = null!;
    
}