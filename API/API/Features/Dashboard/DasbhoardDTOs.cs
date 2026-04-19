namespace API.Features.Dashboard;

public record DashboardStatsResponse(
    // Bus Stats
    int TotalBuses,
    int ActiveBuses,
    int InactiveBuses,
    double ActiveBusesPercentage,
    
    // Driver Stats
    int TotalDrivers,
    int ActiveDrivers,
    int InactiveDrivers,
    double ActiveDriversPercentage,
    
    // Assignment Stats (Today)
    int TodayTotalAssignments,
    int TodayScheduledAssignments,
    int TodayInProgressAssignments,
    int TodayPartiallyCompletedAssignments,
    int TodayCompletedAssignments,
    int TodayCancelledAssignments,
    
    // Time Slot Stats (Today)
    int TodayTotalTimeSlots,
    int TodayCompletedTimeSlots,
    int TodayInProgressTimeSlots,
    double TodayCompletionRate,
    
    // Attendance Stats (Today)
    AttendanceStatsResponse Attendance,
    
    // Recent Data
    List<RecentAssignmentResponse> RecentAssignments,
    List<UpcomingAssignmentResponse> UpcomingAssignments,
    
    // Charts Data
    WeeklyStatsResponse WeeklyStats,
    BusUtilizationResponse BusUtilization
);

public record AttendanceStatsResponse(
    int Present,
    int Absent,
    int Late,
    int OnLeave,
    int Total,
    double AttendancePercentage
);

public record RecentAssignmentResponse(
    int Id,
    string BusNumber,
    string RouteName,
    string DriverName,
    string ServiceDate,
    string Status,
    string TimeRange
);

public record UpcomingAssignmentResponse(
    int Id,
    string BusNumber,
    string RouteName,
    string DriverName,
    string ServiceDate,
    string FirstSlotStart,
    int TotalSlots
);

public record WeeklyStatsResponse(
    List<string> Days,
    List<int> AssignmentsPerDay,
    List<int> CompletedAssignmentsPerDay,
    List<double> AverageOccupancyPerDay
);

public record BusUtilizationResponse(
    int TotalBuses,
    int BusesInService,
    int BusesIdle,
    double UtilizationRate,
    List<BusUtilizationDetail> TopUsedBuses
);

public record BusUtilizationDetail(
    int BusId,
    string BusNumber,
    int TotalAssignments,
    int TotalTimeSlots,
    int CompletedTimeSlots
);