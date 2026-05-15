using API.Data;

namespace API.Features.Student;

public static class StudentEndpoints
{
    public static void MapStudentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/students")
            .WithTags("Students")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));

        group.MapCreateStudent();
        group.MapGetStudents();
        group.MapUpdateStudent();
        group.MapDeleteStudent();
    }
}