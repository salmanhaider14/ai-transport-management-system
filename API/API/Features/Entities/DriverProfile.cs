namespace API.Features.Entities;

public class DriverProfile
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!; // FK to AspNetUsers
    public string LicenseNumber { get; set; } = null!;
    public string PhoneNumber { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    
    public ICollection<BusAssignment> BusAssignments { get; set; } = new List<BusAssignment>();
}
