namespace API.Data;

using API.Features.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<IdentityUser, IdentityRole, string>(options)
{
    public DbSet<Bus> Buses => Set<Bus>();
    public DbSet<Route> Routes => Set<Route>();
    public DbSet<RouteStop> RouteStops => Set<RouteStop>();
    public DbSet<DriverProfile> DriverProfiles => Set<DriverProfile>();
    public DbSet<DriverAttendance> DriverAttendances => Set<DriverAttendance>();
    public DbSet<BusAssignment> BusAssignments => Set<BusAssignment>();
    public DbSet<LocationUpdate> LocationUpdates => Set<LocationUpdate>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // =============================
        // Bus
        // =============================
        builder.Entity<Bus>(entity => { entity.HasIndex(b => b.BusNumber).IsUnique(); });

        // =============================
        // Route
        // =============================
        builder.Entity<Route>(entity =>
        {
            entity.HasMany(r => r.Stops)
                .WithOne(s => s.Route)
                .HasForeignKey(s => s.RouteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =============================
        // RouteStop
        // =============================
        builder.Entity<RouteStop>(entity =>
        {
            entity.HasIndex(s => new { s.RouteId, s.StopOrder })
                .IsUnique();
        });

        // =============================
        // DriverProfile
        // =============================
        builder.Entity<DriverProfile>(entity =>
        {
            entity.HasIndex(d => d.UserId).IsUnique();

            entity.HasOne(d => d.User)
                .WithOne()
                .HasForeignKey<DriverProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<DriverAttendance>()
            .HasIndex(a => new { a.DriverProfileId, a.Date })
            .IsUnique();


        // =============================
        // BusAssignment
        // =============================
        builder.Entity<BusAssignment>(entity =>
        {
            entity.HasIndex(a => new { a.BusId, a.ServiceDate, a.StartTime });

            entity.HasOne(a => a.Bus)
                .WithMany(b => b.BusAssignments)
                .HasForeignKey(a => a.BusId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Route)
                .WithMany(r => r.BusAssignments)
                .HasForeignKey(a => a.RouteId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.DriverProfile)
                .WithMany(d => d.BusAssignments)
                .HasForeignKey(a => a.DriverProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =============================
        // LocationUpdate
        // =============================
        builder.Entity<LocationUpdate>(entity =>
        {
            entity.HasIndex(l => l.BusAssignmentId);
            entity.HasIndex(l => l.Timestamp);

            entity.HasOne(l => l.BusAssignment)
                .WithMany()
                .HasForeignKey(l => l.BusAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });


    }
}
