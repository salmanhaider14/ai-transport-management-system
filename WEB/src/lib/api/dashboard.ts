import { apiClient } from "./client";

export interface DashboardStats {
	totalBuses: number;
	activeBuses: number;
	inactiveBuses: number;
	activeBusesPercentage: number;

	totalDrivers: number;
	activeDrivers: number;
	inactiveDrivers: number;
	activeDriversPercentage: number;

	todayTotalAssignments: number;
	todayScheduledAssignments: number;
	todayInProgressAssignments: number;
	todayPartiallyCompletedAssignments: number;
	todayCompletedAssignments: number;
	todayCancelledAssignments: number;

	todayTotalTimeSlots: number;
	todayCompletedTimeSlots: number;
	todayInProgressTimeSlots: number;
	todayCompletionRate: number;

	attendance: {
		present: number;
		absent: number;
		late: number;
		onLeave: number;
		total: number;
		attendancePercentage: number;
	};

	recentAssignments: Array<{
		id: number;
		busNumber: string;
		routeName: string;
		driverName: string;
		serviceDate: string;
		status: string;
		timeRange: string;
	}>;

	upcomingAssignments: Array<{
		id: number;
		busNumber: string;
		routeName: string;
		driverName: string;
		serviceDate: string;
		firstSlotStart: string;
		totalSlots: number;
	}>;

	weeklyStats: {
		days: string[];
		assignmentsPerDay: number[];
		completedAssignmentsPerDay: number[];
		averageOccupancyPerDay: number[];
	};

	busUtilization: {
		totalBuses: number;
		busesInService: number;
		busesIdle: number;
		utilizationRate: number;
		topUsedBuses: Array<{
			busId: number;
			busNumber: string;
			totalAssignments: number;
			totalTimeSlots: number;
			completedTimeSlots: number;
		}>;
	};
}

export const dashboardApi = {
	getStats: () => apiClient.get<DashboardStats>("/dashboard/stats"),
};
