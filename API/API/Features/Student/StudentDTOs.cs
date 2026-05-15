namespace API.Features.Student;

public record StudentResponse(
    int Id,
    string UserId,
    string SapId,
    string FullName,
    string? Department,
    string? Semester,
    string? PhoneNumber,
    string? Email,
    bool IsActive,
    DateTime CreatedAt
);

public record StudentDetailResponse(
    int Id,
    string UserId,
    string SapId,
    string FullName,
    string? Department,
    string? Semester,
    string? PhoneNumber,
    string? Email,
    bool IsActive,
    string UserName,
    string UserEmail
);

public record CreateStudentRequest(
    string SapId,
    string FullName,
    string Email,
    string? Department,
    string? Semester,
    string? PhoneNumber,
    string? Password = null
);

public record UpdateStudentRequest(
    string? SapId,
    string? FullName,
    string? Department,
    string? Semester,
    string? PhoneNumber,
    string? Email,
    bool? IsActive
);