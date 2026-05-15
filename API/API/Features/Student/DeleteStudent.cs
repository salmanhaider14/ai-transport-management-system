using Microsoft.AspNetCore.Identity;

namespace API.Features.Student;

using API.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class DeleteStudent
{
    public static async Task<Results<NoContent, NotFound>> Handler(
        int id,
        ApplicationDbContext db,
        UserManager<IdentityUser> userManager,
        CancellationToken ct)
    {
        var student = await db.StudentProfiles
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (student == null)
            return TypedResults.NotFound();

        // Soft delete
        student.IsActive = false;

        // Lock the user account
        if (student.User != null)
        {
            student.User.LockoutEnd = DateTimeOffset.MaxValue;
            await userManager.UpdateAsync(student.User);
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapDeleteStudent(this IEndpointRouteBuilder app) =>
        app.MapDelete("/{id:int}", Handler)
            .WithSummary("Soft delete a student")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}