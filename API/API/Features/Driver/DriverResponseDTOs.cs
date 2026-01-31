using API.Features.Entities;

namespace API.Features.Driver;

public record DriverProfileResponse(
    int Id,
    string UserId,
    string LicenseNumber,
    string PhoneNumber,
    string? Address,
    string? NationalId,
    string? EmergencyContact,
    DateTime DateOfJoining,
    bool IsActive
);
public record DriverResponse(
    int Id,
    string UserId,
    string Email,
    string FullName,
    string LicenseNumber,
    string PhoneNumber,
    string? Address,
    string? NationalId,
    string? EmergencyContact,
    DateTime DateOfJoining,
    bool IsActive,
    string? TemporaryPassword = null  // Only included on creation
);
public record DriverAttendanceResponse(
    int Id,
    int DriverProfileId,
    DateOnly Date,
    AttendanceStatus Status,
    TimeOnly? CheckInTime,
    TimeOnly? CheckOutTime,
    string? Remarks
);

public record DriverAttendanceSummaryResponse(
    int DriverProfileId,
    string DriverName,
    DateOnly Date,
    AttendanceStatus Status,
    TimeOnly? CheckInTime,
    TimeOnly? CheckOutTime,
    string? Remarks
);
public record DriverDetailResponse(
    int Id,
    string UserId,
    string Email,
    string UserName,
    string LicenseNumber,
    string PhoneNumber,
    string? Address,
    string? NationalId,
    string? EmergencyContact,
    DateTime DateOfJoining,
    bool IsActive,
    bool IsLockedOut
);