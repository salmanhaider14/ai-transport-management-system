namespace API.Features.Driver;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public record CreateDriverCommand(
    string Email,
    string PhoneNumber,
    string LicenseNumber,
    string? FullName = null,
    string? Address = null,
    string? NationalId = null,
    string? EmergencyContact = null,
    string? Password = null  // Optional, will generate if not provided
);

public class CreateDriverValidator : AbstractValidator<CreateDriverCommand>
{
    public CreateDriverValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(x => x.PhoneNumber)
            .NotEmpty()
            .Matches(@"^\+?[0-9\s\-\(\)]{10,}$")
            .WithMessage("Please enter a valid phone number.");

        RuleFor(x => x.LicenseNumber)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.FullName)
            .MaximumLength(100)
            .When(x => !string.IsNullOrEmpty(x.FullName));

        RuleFor(x => x.NationalId)
            .MaximumLength(20)
            .When(x => !string.IsNullOrEmpty(x.NationalId));

        RuleFor(x => x.EmergencyContact)
            .MaximumLength(20)
            .When(x => !string.IsNullOrEmpty(x.EmergencyContact));

        RuleFor(x => x.Password)
            .MinimumLength(6)
            .When(x => !string.IsNullOrEmpty(x.Password))
            .WithMessage("Password must be at least 6 characters.");
    }
}

public static class CreateDriver
{
    public static async Task<
        Results<ValidationProblem, Conflict<string>, Created<DriverResponse>>
    > Handler(
        IValidator<CreateDriverCommand> validator,
        CreateDriverCommand command,
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
            // 1. Check if email already exists
            var existingUser = await userManager.FindByEmailAsync(command.Email);
            if (existingUser != null)
                return TypedResults.Conflict($"User with email '{command.Email}' already exists.");

            // 2. Check if license number is unique
            var licenseExists = await db.DriverProfiles
                .AnyAsync(d => d.LicenseNumber == command.LicenseNumber, ct);
            if (licenseExists)
                return TypedResults.Conflict($"License number '{command.LicenseNumber}' is already in use.");

            // 3. Create Identity User
            var user = new IdentityUser
            {
                UserName = command.FullName ?? command.Email,
                Email = command.Email,
                PhoneNumber = command.PhoneNumber,
                EmailConfirmed = true  // Admin creates, so email is verified
            };

            // Generate password if not provided
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

            // 4. Add to Driver role
            var roleResult = await userManager.AddToRoleAsync(user, AppRoles.Driver);
            if (!roleResult.Succeeded)
            {
                // Rollback user creation
                await userManager.DeleteAsync(user);
                var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["RoleAssignment"] = new[] { errors }
                });
            }

            // 5. Create Driver Profile
            var driverProfile = new DriverProfile
            {
                UserId = user.Id,
                LicenseNumber = command.LicenseNumber,
                PhoneNumber = command.PhoneNumber,
                Address = command.Address,
                NationalId = command.NationalId,
                EmergencyContact = command.EmergencyContact,
                DateOfJoining = DateTime.UtcNow.Date,
                IsActive = true
            };

            db.DriverProfiles.Add(driverProfile);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            // 6. Prepare response
            var response = new DriverResponse(
                driverProfile.Id,
                user.Id,
                user.Email!,
                command.FullName ?? user.UserName!,
                driverProfile.LicenseNumber,
                driverProfile.PhoneNumber,
                driverProfile.Address,
                driverProfile.NationalId,
                driverProfile.EmergencyContact,
                driverProfile.DateOfJoining,
                driverProfile.IsActive,
                password // Include temp password in response for admin to share
            );

            return TypedResults.Created($"/drivers/{driverProfile.Id}", response);
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
        return new string(Enumerable.Repeat(chars, 8)
            .Select(s => s[random.Next(s.Length)]).ToArray()) + "!1Aa"; // Ensure complexity
    }

    internal static void MapCreateDriverProfile(this IEndpointRouteBuilder app) =>
        app.MapPost("/", Handler)
            .WithSummary("Create a new driver (with Identity user)")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}