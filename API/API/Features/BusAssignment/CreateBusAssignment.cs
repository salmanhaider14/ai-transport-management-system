namespace API.Features.BusAssignment;

using API.Data;
using API.Features.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public record CreateTimeSlotDto(
    TimeOnly StartTime,
    TimeOnly EndTime,
    int SlotNumber,
    string? Notes = null
);

public record CreateBusAssignmentCommand(
    int BusId,
    int RouteId,
    int DriverProfileId,
    DateOnly ServiceDate,
    List<CreateTimeSlotDto> TimeSlots
);

public class CreateBusAssignmentValidator : AbstractValidator<CreateBusAssignmentCommand>
{
    public CreateBusAssignmentValidator()
    {
        RuleFor(x => x.BusId)
            .GreaterThan(0)
            .WithMessage("Bus ID must be greater than 0.");

        RuleFor(x => x.RouteId)
            .GreaterThan(0)
            .WithMessage("Route ID must be greater than 0.");

        RuleFor(x => x.DriverProfileId)
            .GreaterThan(0)
            .WithMessage("Driver profile ID must be greater than 0.");

        RuleFor(x => x.ServiceDate)
            .GreaterThanOrEqualTo(DateOnly.FromDateTime(DateTime.Today))
            .WithMessage("Service date cannot be in the past.");

        RuleFor(x => x.TimeSlots)
            .NotEmpty()
            .WithMessage("At least one time slot is required.")
            .Must(slots => slots.Select(s => s.SlotNumber).Distinct().Count() == slots.Count)
            .WithMessage("Slot numbers must be unique.")
            .Must(slots => slots.Min(s => s.SlotNumber) == 1)
            .WithMessage("Slot numbers must start from 1.")
            .Must(slots => slots.Max(s => s.SlotNumber) == slots.Count)
            .WithMessage("Slot numbers must be sequential (1, 2, 3...).");

        RuleForEach(x => x.TimeSlots).ChildRules(slot =>
        {
            slot.RuleFor(s => s.StartTime)
                .LessThan(s => s.EndTime)
                .WithMessage("Start time must be before end time.");

            slot.RuleFor(s => s.SlotNumber)
                .GreaterThan(0)
                .WithMessage("Slot number must be greater than 0.");
        });

        // Check for overlapping time slots
        RuleFor(x => x.TimeSlots)
            .Must(slots =>
            {
                var orderedSlots = slots.OrderBy(s => s.StartTime).ToList();
                for (int i = 0; i < orderedSlots.Count - 1; i++)
                {
                    if (orderedSlots[i].EndTime >= orderedSlots[i + 1].StartTime)
                        return false;
                }
                return true;
            })
            .WithMessage("Time slots cannot overlap.");
    }
}

public static class CreateBusAssignment
{
    public static async Task<
        Results<ValidationProblem, NotFound, Conflict<string>, Created<BusAssignmentResponse>>
    > Handler(
        IValidator<CreateBusAssignmentCommand> validator,
        CreateBusAssignmentCommand command,
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(command, ct);
        if (!validation.IsValid)
            return TypedResults.ValidationProblem(validation.ToDictionary());

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            // Check if bus exists and is active
            var bus = await db.Buses
                .FirstOrDefaultAsync(b => b.Id == command.BusId && b.IsActive, ct);
            if (bus == null)
                return TypedResults.NotFound();

            // Check if route exists and is active
            var route = await db.Routes
                .FirstOrDefaultAsync(r => r.Id == command.RouteId && r.IsActive, ct);
            if (route == null)
                return TypedResults.NotFound();

            // Check if driver exists, is active, and is available
            var driver = await db.DriverProfiles
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == command.DriverProfileId && d.IsActive, ct);
            if (driver == null)
                return TypedResults.NotFound();

            // Check driver license expiry (optional but important)
            /*
            if (driver.LicenseExpiry.HasValue && driver.LicenseExpiry.Value < command.ServiceDate)
                return TypedResults.Conflict($"Driver's license expires on {driver.LicenseExpiry.Value:yyyy-MM-dd}. Cannot assign for {command.ServiceDate:yyyy-MM-dd}.");
                */

            // Check for conflicts: Bus already assigned at overlapping times
            var existingBusTimeSlots = await db.BusAssignments
                .Where(a => a.BusId == command.BusId && a.ServiceDate == command.ServiceDate)
                .Where(a => a.Status != AssignmentStatus.Cancelled && a.Status != AssignmentStatus.Completed)
                .SelectMany(a => a.TimeSlots)
                .ToListAsync(ct);

            var busConflicts = existingBusTimeSlots
                .Any(existingSlot => command.TimeSlots.Any(cmdSlot =>
                    cmdSlot.StartTime < existingSlot.EndTime && cmdSlot.EndTime > existingSlot.StartTime));
            
            if (busConflicts)
                return TypedResults.Conflict($"Bus is already assigned during one or more of the specified time slots on {command.ServiceDate:yyyy-MM-dd}.");

            // Check for conflicts: Driver already assigned at overlapping times
            var existingDriverTimeSlots = await db.BusAssignments
                .Where(a => a.DriverProfileId == command.DriverProfileId && a.ServiceDate == command.ServiceDate)
                .Where(a => a.Status != AssignmentStatus.Cancelled && a.Status != AssignmentStatus.Completed)
                .SelectMany(a => a.TimeSlots)
                .ToListAsync(ct);

            var driverConflicts = existingDriverTimeSlots
                .Any(existingSlot => command.TimeSlots.Any(cmdSlot =>
                    cmdSlot.StartTime < existingSlot.EndTime && cmdSlot.EndTime > existingSlot.StartTime));
            
            if (driverConflicts)
                return TypedResults.Conflict($"Driver is already assigned during one or more of the specified time slots on {command.ServiceDate:yyyy-MM-dd}.");

            // Create the bus assignment
            var assignment = new BusAssignment
            {
                BusId = command.BusId,
                RouteId = command.RouteId,
                DriverProfileId = command.DriverProfileId,
                ServiceDate = command.ServiceDate,
                Status = AssignmentStatus.Scheduled,
                TimeSlots = command.TimeSlots
                    .OrderBy(s => s.SlotNumber)
                    .Select(s => new TimeSlot
                    {
                        SlotNumber = s.SlotNumber,
                        StartTime = s.StartTime,
                        EndTime = s.EndTime,
                        Status = TimeSlotStatus.Scheduled,
                        Notes = s.Notes
                    })
                    .ToList()
            };

            db.BusAssignments.Add(assignment);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            // Load navigation properties for response
            await db.Entry(assignment)
                .Reference(a => a.Bus)
                .LoadAsync(ct);
            
            await db.Entry(assignment)
                .Reference(a => a.Route)
                .LoadAsync(ct);
            
            await db.Entry(assignment)
                .Reference(a => a.DriverProfile)
                .LoadAsync(ct);

            var response = new BusAssignmentResponse(
                assignment.Id,
                assignment.BusId,
                assignment.Bus.BusNumber,
                assignment.RouteId,
                assignment.Route.Name,
                assignment.DriverProfileId,
                assignment.DriverProfile.User?.UserName ?? "Unknown",
                assignment.ServiceDate,
                assignment.Status,
                assignment.FirstSlotStart,
                assignment.LastSlotEnd,
                assignment.TotalSlots,
                assignment.CompletedSlots,
                assignment.TimeSlots.Select(ts => new TimeSlotResponse(
                    ts.Id,
                    assignment.BusId,
                    ts.SlotNumber,
                    ts.StartTime,
                    ts.EndTime,
                    ts.Status,
                    ts.ActualStartTime,
                    ts.ActualEndTime,
                    ts.Notes
                )).ToList()
            );

            return TypedResults.Created($"/assignments/{assignment.Id}", response);
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    internal static void MapCreateBusAssignment(this IEndpointRouteBuilder app) =>
        app.MapPost("/", Handler)
            .WithSummary("Create a new bus assignment")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}