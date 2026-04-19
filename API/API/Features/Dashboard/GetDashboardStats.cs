namespace API.Features.Dashboard;

using API.Data;
using API.Features.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

public static class GetDashboardStats
{
    public static async Task<Ok<DashboardStatsResponse>> Handler(
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var startOfWeek = today.AddDays(-(int)today.DayOfWeek + 1); // Monday
        var endOfWeek = startOfWeek.AddDays(6);

        // ===== Bus Stats =====
        var totalBuses = await db.Buses.CountAsync(ct);
        var activeBuses = await db.Buses.CountAsync(b => b.IsActive, ct);
        var inactiveBuses = totalBuses - activeBuses;
        var activeBusesPercentage = totalBuses > 0 ? (double)activeBuses / totalBuses * 100 : 0;

        // ===== Driver Stats =====
        var totalDrivers = await db.DriverProfiles.CountAsync(ct);
        var activeDrivers = await db.DriverProfiles.CountAsync(d => d.IsActive, ct);
        var inactiveDrivers = totalDrivers - activeDrivers;
        var activeDriversPercentage = totalDrivers > 0 ? (double)activeDrivers / totalDrivers * 100 : 0;

        // ===== Today's Assignment Stats =====
        var todayAssignments = await db.BusAssignments
            .Include(a => a.TimeSlots)
            .Where(a => a.ServiceDate == today)
            .ToListAsync(ct);

        var todayTotalAssignments = todayAssignments.Count;
        var todayScheduledAssignments = todayAssignments.Count(a => a.Status == AssignmentStatus.Scheduled);
        var todayInProgressAssignments = todayAssignments.Count(a => a.Status == AssignmentStatus.InProgress);
        var todayPartiallyCompletedAssignments = todayAssignments.Count(a => a.Status == AssignmentStatus.PartiallyCompleted);
        var todayCompletedAssignments = todayAssignments.Count(a => a.Status == AssignmentStatus.Completed);
        var todayCancelledAssignments = todayAssignments.Count(a => a.Status == AssignmentStatus.Cancelled);

        // ===== Today's Time Slot Stats =====
        var todayTimeSlots = todayAssignments.SelectMany(a => a.TimeSlots).ToList();
        var todayTotalTimeSlots = todayTimeSlots.Count;
        var todayCompletedTimeSlots = todayTimeSlots.Count(ts => ts.Status == TimeSlotStatus.Completed);
        var todayInProgressTimeSlots = todayTimeSlots.Count(ts => ts.Status == TimeSlotStatus.InProgress);
        var todayCompletionRate = todayTotalTimeSlots > 0 ? (double)todayCompletedTimeSlots / todayTotalTimeSlots * 100 : 0;

        // ===== Today's Attendance Stats =====
        var todayAttendance = await db.DriverAttendances
            .Where(a => a.Date == today)
            .ToListAsync(ct);

        var totalDriversForAttendance = activeDrivers; // Only active drivers considered
        var present = todayAttendance.Count(a => a.Status == AttendanceStatus.Present);
        var absent = todayAttendance.Count(a => a.Status == AttendanceStatus.Absent);
        var late = todayAttendance.Count(a => a.Status == AttendanceStatus.Late);
        var onLeave = todayAttendance.Count(a => a.Status == AttendanceStatus.OnLeave);
        var attendancePercentage = totalDriversForAttendance > 0 
            ? (double)(present + late) / totalDriversForAttendance * 100 
            : 0;

        var attendanceStats = new AttendanceStatsResponse(
            Present: present,
            Absent: absent,
            Late: late,
            OnLeave: onLeave,
            Total: totalDriversForAttendance,
            AttendancePercentage: Math.Round(attendancePercentage, 1)
        );

        // ===== Recent Assignments (Last 5) =====
        // ===== Recent Assignments (Last 5) =====
        var recentAssignmentsQuery = await db.BusAssignments
            .Include(a => a.Bus)
            .Include(a => a.Route)
            .Include(a => a.DriverProfile)
            .ThenInclude(d => d.User)
            .Include(a => a.TimeSlots)
            .ToListAsync(ct); // ← Execute first

        var recentAssignments = recentAssignmentsQuery
            .OrderByDescending(a => a.ServiceDate)
            .ThenByDescending(a => a.Id)
            .Take(5)
            .ToList();

        var recentAssignmentsResponse = recentAssignments.Select(a => new RecentAssignmentResponse(
            Id: a.Id,
            BusNumber: a.Bus.BusNumber,
            RouteName: a.Route.Name,
            DriverName: a.DriverProfile.User?.UserName ?? "Unknown",
            ServiceDate: a.ServiceDate.ToString("yyyy-MM-dd"),
            Status: a.Status.ToString(),
            TimeRange: a.TimeSlots.Any() 
                ? $"{a.TimeSlots.Min(ts => ts.StartTime):HH:mm} - {a.TimeSlots.Max(ts => ts.EndTime):HH:mm}"
                : "-"
        )).ToList();

        // ===== Upcoming Assignments (Next 5) =====
        var upcomingAssignmentsQuery = await db.BusAssignments
            .Include(a => a.Bus)
            .Include(a => a.Route)
            .Include(a => a.DriverProfile)
            .ThenInclude(d => d.User)
            .Include(a => a.TimeSlots)
            .Where(a => a.ServiceDate >= today && a.Status != AssignmentStatus.Cancelled && a.Status != AssignmentStatus.Completed)
            .ToListAsync(ct);

// Then order client-side (in memory) using actual data from TimeSlots
        var upcomingAssignments = upcomingAssignmentsQuery
            .OrderBy(a => a.ServiceDate)
            .ThenBy(a => a.TimeSlots.MinBy(ts => ts.StartTime)?.StartTime)
            .Take(5)
            .ToList();

        var upcomingAssignmentsResponse = upcomingAssignments.Select(a => new UpcomingAssignmentResponse(
            Id: a.Id,
            BusNumber: a.Bus.BusNumber,
            RouteName: a.Route.Name,
            DriverName: a.DriverProfile.User?.UserName ?? "Unknown",
            ServiceDate: a.ServiceDate.ToString("yyyy-MM-dd"),
            FirstSlotStart: a.TimeSlots.MinBy(ts => ts.StartTime)?.StartTime.ToString("HH:mm") ?? "-",
            TotalSlots: a.TimeSlots.Count
        )).ToList();
        // ===== Weekly Stats (Current Week) =====
        var weeklyAssignments = await db.BusAssignments
            .Include(a => a.TimeSlots)
            .Where(a => a.ServiceDate >= startOfWeek && a.ServiceDate <= endOfWeek)
            .ToListAsync(ct);

        var daysOfWeek = new List<string> { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };
        var assignmentsPerDay = new List<int>();
        var completedAssignmentsPerDay = new List<int>();
        var averageOccupancyPerDay = new List<double>();

        for (int i = 0; i < 7; i++)
        {
            var currentDate = startOfWeek.AddDays(i);
            var dayAssignments = weeklyAssignments.Where(a => a.ServiceDate == currentDate).ToList();
            
            assignmentsPerDay.Add(dayAssignments.Count);
            completedAssignmentsPerDay.Add(dayAssignments.Count(a => a.Status == AssignmentStatus.Completed));
            
            // Calculate average occupancy (simplified - based on completed time slots)
            var dayTimeSlots = dayAssignments.SelectMany(a => a.TimeSlots).ToList();
            var completedSlots = dayTimeSlots.Count(ts => ts.Status == TimeSlotStatus.Completed);
            var avgOccupancy = dayTimeSlots.Count > 0 ? (double)completedSlots / dayTimeSlots.Count * 100 : 0;
            averageOccupancyPerDay.Add(Math.Round(avgOccupancy, 1));
        }

        var weeklyStats = new WeeklyStatsResponse(
            Days: daysOfWeek,
            AssignmentsPerDay: assignmentsPerDay,
            CompletedAssignmentsPerDay: completedAssignmentsPerDay,
            AverageOccupancyPerDay: averageOccupancyPerDay
        );

        // ===== Bus Utilization =====
        var allBuses = await db.Buses
            .Include(b => b.BusAssignments)
                .ThenInclude(a => a.TimeSlots)
            .ToListAsync(ct);

        var busesInService = allBuses.Count(b => b.IsActive && b.BusAssignments.Any(a => a.ServiceDate >= today.AddDays(-30)));
        var busesIdle = activeBuses - busesInService;
        var utilizationRate = activeBuses > 0 ? (double)busesInService / activeBuses * 100 : 0;

        var topUsedBuses = allBuses
            .Where(b => b.IsActive)
            .Select(b => new BusUtilizationDetail(
                BusId: b.Id,
                BusNumber: b.BusNumber,
                TotalAssignments: b.BusAssignments.Count,
                TotalTimeSlots: b.BusAssignments.SelectMany(a => a.TimeSlots).Count(),
                CompletedTimeSlots: b.BusAssignments.SelectMany(a => a.TimeSlots).Count(ts => ts.Status == TimeSlotStatus.Completed)
            ))
            .OrderByDescending(b => b.TotalAssignments)
            .Take(5)
            .ToList();

        var busUtilization = new BusUtilizationResponse(
            TotalBuses: totalBuses,
            BusesInService: busesInService,
            BusesIdle: busesIdle,
            UtilizationRate: Math.Round(utilizationRate, 1),
            TopUsedBuses: topUsedBuses
        );

        // ===== Final Response =====
        var response = new DashboardStatsResponse(
            TotalBuses: totalBuses,
            ActiveBuses: activeBuses,
            InactiveBuses: inactiveBuses,
            ActiveBusesPercentage: Math.Round(activeBusesPercentage, 1),
            
            TotalDrivers: totalDrivers,
            ActiveDrivers: activeDrivers,
            InactiveDrivers: inactiveDrivers,
            ActiveDriversPercentage: Math.Round(activeDriversPercentage, 1),
            
            TodayTotalAssignments: todayTotalAssignments,
            TodayScheduledAssignments: todayScheduledAssignments,
            TodayInProgressAssignments: todayInProgressAssignments,
            TodayPartiallyCompletedAssignments: todayPartiallyCompletedAssignments,
            TodayCompletedAssignments: todayCompletedAssignments,
            TodayCancelledAssignments: todayCancelledAssignments,
            
            TodayTotalTimeSlots: todayTotalTimeSlots,
            TodayCompletedTimeSlots: todayCompletedTimeSlots,
            TodayInProgressTimeSlots: todayInProgressTimeSlots,
            TodayCompletionRate: Math.Round(todayCompletionRate, 1),
            
            Attendance: attendanceStats,
            RecentAssignments: recentAssignmentsResponse,
            UpcomingAssignments: upcomingAssignmentsResponse,
            WeeklyStats: weeklyStats,
            BusUtilization: busUtilization
        );

        return TypedResults.Ok(response);
    }

    internal static void MapGetDashboardStats(this IEndpointRouteBuilder app) =>
        app.MapGet("/stats", Handler)
            .WithSummary("Get dashboard statistics")
            .WithName("GetDashboardStats")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Admin));
}