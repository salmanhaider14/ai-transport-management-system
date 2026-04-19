"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import { useTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Bus, ClipboardTextIcon, NoteIcon, TrendDownIcon, TrendUpIcon, UserRectangleIcon } from "@phosphor-icons/react";

import { config } from "@/config";
import { dashboardApi, DashboardStats } from "@/lib/api/dashboard";

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const statusColorMap: Record<string, "default" | "primary" | "success" | "error" | "warning" | "info"> = {
	Scheduled: "info",
	InProgress: "warning",
	PartiallyCompleted: "primary",
	Completed: "success",
	Cancelled: "error",
	Draft: "default",
};

export default function DashboardPage() {
	const theme = useTheme();
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchStats = async () => {
			try {
				setLoading(true);
				const data = await dashboardApi.getStats();
				setStats(data);
				setError(null);
			} catch (err: any) {
				setError(err.message || "Failed to load dashboard stats");
			} finally {
				setLoading(false);
			}
		};
		fetchStats();
	}, []);

	useEffect(() => {
		document.title = `Dashboard | ${config.site.name}`;
	}, []);

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">{error}</Alert>
			</Box>
		);
	}

	if (!stats) return null;

	// Chart configurations
	const weeklyChartOptions = {
		chart: {
			type: "line" as const,
			toolbar: { show: false },
			zoom: { enabled: false },
		},
		colors: [theme.palette.primary.main, theme.palette.success.main],
		stroke: { curve: "smooth" as const, width: 2 },
		xaxis: {
			categories: stats.weeklyStats.days,
			title: { text: "Day of Week" },
		},
		yaxis: { title: { text: "Number of Assignments" } },
		tooltip: { shared: true, intersect: false },
		legend: { position: "top" as const },
	};

	const weeklyChartSeries = [
		{ name: "Total Assignments", data: stats.weeklyStats.assignmentsPerDay },
		{ name: "Completed", data: stats.weeklyStats.completedAssignmentsPerDay },
	];

	const occupancyChartOptions = {
		chart: {
			type: "bar" as const,
			toolbar: { show: false },
		},
		colors: [theme.palette.warning.main],
		plotOptions: {
			bar: { borderRadius: 4, horizontal: false },
		},
		xaxis: {
			categories: stats.weeklyStats.days,
			title: { text: "Day of Week" },
		},
		yaxis: { title: { text: "Occupancy Rate (%)" }, max: 100 },
		tooltip: { y: { formatter: (val: number) => `${val}%` } },
	};

	const occupancyChartSeries = [{ name: "Occupancy Rate", data: stats.weeklyStats.averageOccupancyPerDay }];

	const utilizationChartOptions = {
		chart: {
			type: "donut" as const,
			toolbar: { show: false },
		},
		colors: [theme.palette.success.main, theme.palette.grey[400]],
		labels: ["In Service", "Idle"],
		legend: { position: "bottom" as const },
		plotOptions: {
			pie: { donut: { size: "65%" } },
		},
	};

	const utilizationChartSeries = [stats.busUtilization.busesInService, stats.busUtilization.busesIdle];

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant="h4" gutterBottom>
				Dashboard
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Welcome back! Here's what's happening with your transport system today.
			</Typography>

			{/* Stats Cards Row */}
			<Grid container spacing={3}>
				{/* Buses Card */}
				<Grid size={{ lg: 3, sm: 6, xs: 12 }}>
					<Card sx={{ height: "100%" }}>
						<CardContent>
							<Box display="flex" alignItems="center" justifyContent="space-between">
								<Box>
									<Typography color="text.secondary" variant="overline">
										Total Buses
									</Typography>
									<Typography variant="h4">{stats.totalBuses}</Typography>
									<Box display="flex" alignItems="center" gap={1} mt={1}>
										<Chip label={`${stats.activeBuses} Active`} size="small" color="success" />
										<Chip label={`${stats.inactiveBuses} Inactive`} size="small" color="error" />
									</Box>
									<Typography variant="caption" color="text.secondary" display="block" mt={1}>
										{stats.activeBusesPercentage}% active rate
									</Typography>
								</Box>
								<Bus size={48} weight="duotone" color={theme.palette.primary.main} />
							</Box>
						</CardContent>
					</Card>
				</Grid>

				{/* Drivers Card */}
				<Grid size={{ lg: 3, sm: 6, xs: 12 }}>
					<Card sx={{ height: "100%" }}>
						<CardContent>
							<Box display="flex" alignItems="center" justifyContent="space-between">
								<Box>
									<Typography color="text.secondary" variant="overline">
										Total Drivers
									</Typography>
									<Typography variant="h4">{stats.totalDrivers}</Typography>
									<Box display="flex" alignItems="center" gap={1} mt={1}>
										<Chip label={`${stats.activeDrivers} Active`} size="small" color="success" />
										<Chip label={`${stats.inactiveDrivers} Inactive`} size="small" color="error" />
									</Box>
									<Typography variant="caption" color="text.secondary" display="block" mt={1}>
										{stats.activeDriversPercentage}% active rate
									</Typography>
								</Box>
								<UserRectangleIcon size={48} weight="duotone" color={theme.palette.secondary.main} />
							</Box>
						</CardContent>
					</Card>
				</Grid>

				{/* Today's Assignments Card */}
				<Grid size={{ lg: 3, sm: 6, xs: 12 }}>
					<Card sx={{ height: "100%" }}>
						<CardContent>
							<Box display="flex" alignItems="center" justifyContent="space-between">
								<Box>
									<Typography color="text.secondary" variant="overline">
										Today's Assignments
									</Typography>
									<Typography variant="h4">{stats.todayTotalAssignments}</Typography>
									<Box display="flex" alignItems="center" gap={0.5} mt={1} flexWrap="wrap">
										<Chip label={`${stats.todayCompletedAssignments} Done`} size="small" color="success" />
										<Chip label={`${stats.todayInProgressAssignments} Active`} size="small" color="warning" />
										<Chip label={`${stats.todayScheduledAssignments} Scheduled`} size="small" color="info" />
									</Box>
									<Typography variant="caption" color="text.secondary" display="block" mt={1}>
										{stats.todayCompletionRate}% completion rate
									</Typography>
								</Box>
								<ClipboardTextIcon size={48} weight="duotone" color={theme.palette.warning.main} />
							</Box>
						</CardContent>
					</Card>
				</Grid>

				{/* Attendance Card */}
				<Grid size={{ lg: 3, sm: 6, xs: 12 }}>
					<Card sx={{ height: "100%" }}>
						<CardContent>
							<Box display="flex" alignItems="center" justifyContent="space-between">
								<Box>
									<Typography color="text.secondary" variant="overline">
										Today's Attendance
									</Typography>
									<Typography variant="h4">{stats.attendance.attendancePercentage}%</Typography>
									<Box display="flex" alignItems="center" gap={1} mt={1}>
										<Chip label={`${stats.attendance.present} Present`} size="small" color="success" />
										<Chip label={`${stats.attendance.late} Late`} size="small" color="warning" />
										<Chip label={`${stats.attendance.absent} Absent`} size="small" color="error" />
									</Box>
									<Typography variant="caption" color="text.secondary" display="block" mt={1}>
										{stats.attendance.present + stats.attendance.late} / {stats.attendance.total} on time
									</Typography>
								</Box>
								<NoteIcon size={48} weight="duotone" color={theme.palette.info.main} />
							</Box>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Charts Row */}
			<Grid container spacing={3} sx={{ mt: 1 }}>
				<Grid size={{ lg: 8, xs: 12 }}>
					<Card>
						<CardHeader title="Weekly Assignment Trends" />
						<Divider />
						<CardContent>
							<Chart options={weeklyChartOptions} series={weeklyChartSeries} type="line" height={350} />
						</CardContent>
					</Card>
				</Grid>

				<Grid size={{ lg: 4, xs: 12 }}>
					<Card sx={{ height: "100%" }}>
						<CardHeader title="Bus Utilization" />
						<Divider />
						<CardContent>
							<Chart options={utilizationChartOptions} series={utilizationChartSeries} type="donut" height={280} />
							<Box mt={2}>
								<Typography variant="body2" color="text.secondary" align="center">
									Utilization Rate: <strong>{stats.busUtilization.utilizationRate}%</strong>
								</Typography>
								<Typography variant="caption" color="text.secondary" align="center" display="block">
									{stats.busUtilization.busesInService} of {stats.busUtilization.totalBuses} buses active in last 30
									days
								</Typography>
							</Box>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Occupancy Chart Row */}
			<Grid container spacing={3} sx={{ mt: 1 }}>
				<Grid size={{ xs: 12 }}>
					<Card>
						<CardHeader title="Daily Occupancy Rate (Last 7 Days)" subheader="Based on completed vs total time slots" />
						<Divider />
						<CardContent>
							<Chart options={occupancyChartOptions} series={occupancyChartSeries} type="bar" height={350} />
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Top Used Buses */}
			<Grid container spacing={3} sx={{ mt: 1 }}>
				<Grid size={{ lg: 6, md: 12, xs: 12 }}>
					<Card>
						<CardHeader title="Most Used Buses" />
						<Divider />
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Bus Number</TableCell>
										<TableCell align="center">Assignments</TableCell>
										<TableCell align="center">Time Slots</TableCell>
										<TableCell align="center">Completed</TableCell>
										<TableCell align="center">Success Rate</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.busUtilization.topUsedBuses.map((bus) => (
										<TableRow key={bus.busId}>
											<TableCell>{bus.busNumber}</TableCell>
											<TableCell align="center">{bus.totalAssignments}</TableCell>
											<TableCell align="center">{bus.totalTimeSlots}</TableCell>
											<TableCell align="center">{bus.completedTimeSlots}</TableCell>
											<TableCell align="center">
												{bus.totalTimeSlots > 0
													? `${Math.round((bus.completedTimeSlots / bus.totalTimeSlots) * 100)}%`
													: "0%"}
											</TableCell>
										</TableRow>
									))}
									{stats.busUtilization.topUsedBuses.length === 0 && (
										<TableRow>
											<TableCell colSpan={5} align="center">
												No data available
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</Card>
				</Grid>

				{/* Upcoming Assignments */}
				<Grid size={{ lg: 6, md: 12, xs: 12 }}>
					<Card>
						<CardHeader title="Upcoming Assignments" />
						<Divider />
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Bus</TableCell>
										<TableCell>Route</TableCell>
										<TableCell>Driver</TableCell>
										<TableCell>Date</TableCell>
										<TableCell>Time</TableCell>
										<TableCell align="center">Slots</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.upcomingAssignments.map((assignment) => (
										<TableRow key={assignment.id}>
											<TableCell>{assignment.busNumber}</TableCell>
											<TableCell>{assignment.routeName}</TableCell>
											<TableCell>{assignment.driverName}</TableCell>
											<TableCell>{assignment.serviceDate}</TableCell>
											<TableCell>{assignment.firstSlotStart}</TableCell>
											<TableCell align="center">{assignment.totalSlots}</TableCell>
										</TableRow>
									))}
									{stats.upcomingAssignments.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} align="center">
												No upcoming assignments
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</Card>
				</Grid>
			</Grid>

			{/* Recent Assignments */}
			<Grid container spacing={3} sx={{ mt: 1 }}>
				<Grid size={{ xs: 12 }}>
					<Card>
						<CardHeader title="Recent Assignments" />
						<Divider />
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Bus</TableCell>
										<TableCell>Route</TableCell>
										<TableCell>Driver</TableCell>
										<TableCell>Date</TableCell>
										<TableCell>Time Range</TableCell>
										<TableCell align="center">Status</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.recentAssignments.map((assignment) => (
										<TableRow key={assignment.id}>
											<TableCell>{assignment.busNumber}</TableCell>
											<TableCell>{assignment.routeName}</TableCell>
											<TableCell>{assignment.driverName}</TableCell>
											<TableCell>{assignment.serviceDate}</TableCell>
											<TableCell>{assignment.timeRange}</TableCell>
											<TableCell align="center">
												<Chip
													label={assignment.status}
													size="small"
													color={statusColorMap[assignment.status] || "default"}
												/>
											</TableCell>
										</TableRow>
									))}
									{stats.recentAssignments.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} align="center">
												No recent assignments
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</Card>
				</Grid>
			</Grid>
		</Box>
	);
}
