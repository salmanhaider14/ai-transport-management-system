namespace API.Features.Driver;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record UpdateDriverProfileCommand(
    string? LicenseNumber = null,
    string? PhoneNumber = null,
    string? Address = null,
    string? NationalId = null,
    string? EmergencyContact = null,
    bool? IsActive = null
);

public class UpdateDriverProfileValidator : AbstractValidator<UpdateDriverProfileCommand>
{
    public UpdateDriverProfileValidator()
    {
        RuleFor(x => x.LicenseNumber)
            .MaximumLength(50)
            .When(x => !string.IsNullOrEmpty(x.LicenseNumber));

        RuleFor(x => x.PhoneNumber)
            .Matches(@"^\+?[0-9\s\-\(\)]{10,}$")
            .When(x => !string.IsNullOrEmpty(x.PhoneNumber))
            .WithMessage("Please enter a valid phone number.");

        RuleFor(x => x.NationalId)
            .MaximumLength(20)
            .When(x => !string.IsNullOrEmpty(x.NationalId));

        RuleFor(x => x.EmergencyContact)
            .MaximumLength(20)
            .When(x => !string.IsNullOrEmpty(x.EmergencyContact));
    }
}

public static class UpdateDriverProfile
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, NoContent>
    > Handler(
        int id,
        IValidator<UpdateDriverProfileCommand> validator,
        UpdateDriverProfileCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        var driverProfile = await db.DriverProfiles.FindAsync([id], ct);
        if (driverProfile is null)
            return TypedResults.NotFound();

        // Check license number uniqueness if being changed
        if (!string.IsNullOrEmpty(command.LicenseNumber) && 
            driverProfile.LicenseNumber != command.LicenseNumber)
        {
            var licenseExists = await db.DriverProfiles
                .AnyAsync(d => d.LicenseNumber == command.LicenseNumber && d.Id != id, ct);
            if (licenseExists)
                return TypedResults.Conflict($"License number '{command.LicenseNumber}' is already in use.");
        }

        // Update only provided fields
        if (!string.IsNullOrEmpty(command.LicenseNumber))
            driverProfile.LicenseNumber = command.LicenseNumber;

        if (!string.IsNullOrEmpty(command.PhoneNumber))
            driverProfile.PhoneNumber = command.PhoneNumber;

        if (command.Address != null)
            driverProfile.Address = command.Address;

        if (command.NationalId != null)
            driverProfile.NationalId = command.NationalId;

        if (command.EmergencyContact != null)
            driverProfile.EmergencyContact = command.EmergencyContact;

        if (command.IsActive.HasValue)
            driverProfile.IsActive = command.IsActive.Value;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    internal static void MapUpdateDriverProfile(this IEndpointRouteBuilder app) =>
        app.MapPut("/{id:int}", Handler)
            .WithSummary("Update a driver profile")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}