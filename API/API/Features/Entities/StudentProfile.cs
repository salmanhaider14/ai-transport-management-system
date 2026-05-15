using Microsoft.AspNetCore.Identity;

namespace API.Features.Entities;

public class StudentProfile
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!; // FK to AspNetUsers
    public string SapId { get; set; } = null!; // University SAP ID
    public string FullName { get; set; } = null!;
    public string? Department { get; set; }
    public string? Semester { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public IdentityUser User { get; set; } = null!;
}