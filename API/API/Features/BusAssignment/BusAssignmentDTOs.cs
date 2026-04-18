using API.Features.Entities;

namespace API.Features.BusAssignment;

public record BusAssignmentResponse(
    int Id,
    int BusId,
    string BusNumber,
    int RouteId,
    string RouteName,
    int DriverProfileId,
    string DriverName,
    DateOnly ServiceDate,
    AssignmentStatus Status,
    TimeOnly? FirstSlotStart,
    TimeOnly? LastSlotEnd,
    int TotalSlots,
    int CompletedSlots,
    List<TimeSlotResponse> TimeSlots
);

public record TimeSlotResponse(
    int Id,
    int SlotNumber,
    int? BusAssignmentId,
    TimeOnly StartTime,
    TimeOnly EndTime,
    TimeSlotStatus Status,
    TimeOnly? ActualStartTime,
    TimeOnly? ActualEndTime,
    string? Notes
);
public record BusAssignmentSummaryResponse(
    int Id,
    int BusId,
    string BusNumber,
    int RouteId,
    string RouteName,
    int DriverProfileId,
    string DriverName,
    DateOnly ServiceDate,
    AssignmentStatus Status,
    TimeOnly? FirstSlotStart,
    TimeOnly? LastSlotEnd,
    int TotalSlots,
    int CompletedSlots
);