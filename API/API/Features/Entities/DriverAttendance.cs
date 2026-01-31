namespace API.Features.Entities;

public enum AttendanceStatus
{
    Present,
    Absent,
    Late,
    OnLeave
}

public class DriverAttendance
{
    public int Id { get; set; }

    public int DriverProfileId { get; set; }
    public DriverProfile DriverProfile { get; set; } = null!;

    public DateOnly Date { get; set; }
    public AttendanceStatus Status { get; set; }

    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }

    public string? Remarks { get; set; }
}