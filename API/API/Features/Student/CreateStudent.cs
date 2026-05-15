namespace API.Features.Student;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public record CreateStudentCommand(
    string SapId,
    string FullName,
    string Email,
    string? Department,
    string? Semester,
    string? PhoneNumber,
    string? Password
);

public class CreateStudentValidator : AbstractValidator<CreateStudentCommand>
{
    public CreateStudentValidator()
    {
        RuleFor(x => x.SapId).NotEmpty().MaximumLength(50);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).MinimumLength(6).When(x => !string.IsNullOrEmpty(x.Password));
    }
}

public static class CreateStudent
{
    public static async Task<Results<ValidationProblem, Conflict<string>, Created<StudentResponse>>> Handler(
        IValidator<CreateStudentCommand> validator,
        CreateStudentCommand command,
        ApplicationDbContext db,
        UserManager<IdentityUser> userManager,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            // Check email exists
            var existingUser = await userManager.FindByEmailAsync(command.Email);
            if (existingUser != null)
                return TypedResults.Conflict($"User with email '{command.Email}' already exists.");

            // Check SAP ID exists
            var existingSap = await db.StudentProfiles.AnyAsync(s => s.SapId == command.SapId, ct);
            if (existingSap)
                return TypedResults.Conflict($"Student with SAP ID '{command.SapId}' already exists.");

            // Create Identity User
            var user = new IdentityUser
            {
                UserName = command.Email,
                Email = command.Email,
                EmailConfirmed = true
            };

            var password = command.Password ?? GenerateTemporaryPassword();
            var userResult = await userManager.CreateAsync(user, password);
            if (!userResult.Succeeded)
            {
                var errors = string.Join(", ", userResult.Errors.Select(e => e.Description));
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["UserCreation"] = new[] { errors }
                });
            }

            // Add to Student role
            await userManager.AddToRoleAsync(user, AppRoles.Student);

            // Create Student Profile
            var student = new StudentProfile
            {
                UserId = user.Id,
                SapId = command.SapId,
                FullName = command.FullName,
                Department = command.Department,
                Semester = command.Semester,
                PhoneNumber = command.PhoneNumber,
                Email = command.Email,
                IsActive = true
            };

            db.StudentProfiles.Add(student);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            var response = new StudentResponse(
                student.Id,
                student.UserId,
                student.SapId,
                student.FullName,
                student.Department,
                student.Semester,
                student.PhoneNumber,
                student.Email,
                student.IsActive,
                student.CreatedAt
            );

            return TypedResults.Created($"/students/{student.Id}", response);
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    private static string GenerateTemporaryPassword()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 8).Select(s => s[random.Next(s.Length)]).ToArray()) + "!1Aa";
    }

    internal static void MapCreateStudent(this IEndpointRouteBuilder app) =>
        app.MapPost("/", Handler)
            .WithSummary("Create a new student")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}