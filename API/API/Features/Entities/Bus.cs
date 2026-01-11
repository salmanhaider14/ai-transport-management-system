namespace API.Features.Entities;

public class Bus
{
    public int Id { get; set; }
    public string BusNumber { get; set; } = null!;
    public int Capacity { get; set; }
    public bool IsActive { get; set; } = true;
    
    public ICollection<BusAssignment> BusAssignments { get; set; } = new List<BusAssignment>();
}
