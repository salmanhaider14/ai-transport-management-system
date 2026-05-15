using Microsoft.AspNetCore.Identity;

namespace API.Features.Student;

using API.Data;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record UpdateStudentCommand(
    string? SapId,
    string? FullName,
    string? Department,
    string? Semester,
    string? PhoneNumber,
    string? Email,
    bool? IsActive
);

public class UpdateStudentValidator : AbstractValidator<UpdateStudentCommand>
{
    public UpdateStudentValidator()
    {
        RuleFor(x => x.SapId).MaximumLength(50).When(x => !string.IsNullOrEmpty(x.SapId));
        RuleFor(x => x.FullName).MaximumLength(100).When(x => !string.IsNullOrEmpty(x.FullName));
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
    }
}

public static class UpdateStudent
{
    public static async Task<Results<ValidationProblem, NotFound, Conflict<string>, NoContent>> Handler(
        int id,
        IValidator<UpdateStudentCommand> validator,
        UpdateStudentCommand command,
        ApplicationDbContext db,
        UserManager<IdentityUser> userManager,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var student = await db.StudentProfiles
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (student == null)
            return TypedResults.NotFound();

        // Check SAP ID uniqueness
        if (!string.IsNullOrEmpty(command.SapId) && command.SapId != student.SapId)
        {
            var sapExists = await db.StudentProfiles.AnyAsync(s => s.SapId == command.SapId && s.Id != id, ct);
            if (sapExists)
                return TypedResults.Conflict($"SAP ID '{command.SapId}' is already in use.");
            student.SapId = command.SapId;
        }

        // Update fields
        if (!string.IsNullOrEmpty(command.FullName))
            student.FullName = command.FullName;

        if (command.Department != null)
            student.Department = command.Department;

        if (command.Semester != null)
            student.Semester = command.Semester;

        if (command.PhoneNumber != null)
            student.PhoneNumber = command.PhoneNumber;

        if (!string.IsNullOrEmpty(command.Email) && command.Email != student.Email)
        {
            // Check email uniqueness
            var emailExists = await userManager.FindByEmailAsync(command.Email);
            if (emailExists != null && emailExists.Id != student.UserId)
                return TypedResults.Conflict($"Email '{command.Email}' is already in use.");

            student.Email = command.Email;
            student.User.Email = command.Email;
            student.User.UserName = command.Email;
        }

        if (command.IsActive.HasValue)
            student.IsActive = command.IsActive.Value;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapUpdateStudent(this IEndpointRouteBuilder app) =>
        app.MapPut("/{id:int}", Handler)
            .WithSummary("Update a student")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}