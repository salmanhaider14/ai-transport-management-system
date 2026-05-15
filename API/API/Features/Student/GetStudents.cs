namespace API.Features.Student;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetStudents
{
    public static async Task<Ok<List<StudentResponse>>> Handler(
        ApplicationDbContext db,
        bool? isActive = null,
        CancellationToken ct = default)
    {
        var query = db.StudentProfiles.AsQueryable();

        if (isActive.HasValue)
            query = query.Where(s => s.IsActive == isActive.Value);

        var students = await query
            .OrderBy(s => s.FullName)
            .ToListAsync(ct);

        var response = students.Select(s => new StudentResponse(
            s.Id,
            s.UserId,
            s.SapId,
            s.FullName,
            s.Department,
            s.Semester,
            s.PhoneNumber,
            s.Email,
            s.IsActive,
            s.CreatedAt
        )).ToList();

        return TypedResults.Ok(response);
    }

    internal static void MapGetStudents(this IEndpointRouteBuilder app) =>
        app.MapGet("/", Handler)
            .WithSummary("Get all students")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}