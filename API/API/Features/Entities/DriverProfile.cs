using Microsoft.AspNetCore.Identity;

namespace API.Features.Entities;

public class DriverProfile
{
    public int Id { get; set; }

    public string UserId { get; set; } = null!; // FK → AspNetUsers
    public IdentityUser User { get; set; } = null!;

    public string LicenseNumber { get; set; } = null!;
    public string PhoneNumber { get; set; } = null!;

    public string? Address { get; set; }
    public string? NationalId { get; set; } // CNIC
    public string? EmergencyContact { get; set; }

    public DateTime DateOfJoining { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<DriverAttendance> Attendances { get; set; } = new List<DriverAttendance>();
    public ICollection<BusAssignment> BusAssignments { get; set; } = new List<BusAssignment>();
}