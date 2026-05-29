"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Bus, ClipboardTextIcon, NoteIcon, UserRectangleIcon } from "@phosphor-icons/react";

import { config } from "@/config";
import { dashboardApi, DashboardStats } from "@/lib/api/dashboard";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const statusColorMap: Record<string, "default" | "primary" | "success" | "error" | "warning" | "info"> = {
	Scheduled: "info",
	InProgress: "warning",
	PartiallyCompleted: "primary",
	Completed: "success",
	Cancelled: "error",
	Draft: "default",
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
	label: string;
	value: string | number;
	chips: { label: string; color: "success" | "error" | "warning" | "info" }[];
	caption: string;
	icon: React.ReactNode;
	iconBg: string;
}

function StatCard({ label, value, chips, caption, icon, iconBg }: StatCardProps) {
	return (
		<Card
			sx={{
				height: "100%",
				borderRadius: 3,
				boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
				transition: "box-shadow 0.2s",
				"&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.12)" },
			}}
		>
			<CardContent sx={{ p: 3 }}>
				<Stack direction="row" alignItems="flex-start" justifyContent="space-between">
					<Box flex={1}>
						<Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>
							{label}
						</Typography>
						<Typography variant="h3" sx={{ fontWeight: 700, my: 0.5 }}>
							{value}
						</Typography>
						<Stack direction="row" flexWrap="wrap" gap={0.75} mt={1}>
							{chips.map((c) => (
								<Chip key={c.label} label={c.label} size="small" color={c.color} />
							))}
						</Stack>
						<Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
							{caption}
						</Typography>
					</Box>
					<Avatar
						sx={{
							bgcolor: iconBg,
							width: 52,
							height: 52,
							borderRadius: 2.5,
							ml: 2,
							flexShrink: 0,
						}}
					>
						{icon}
					</Avatar>
				</Stack>
			</CardContent>
		</Card>
	);
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<Typography
			variant="overline"
			color="text.secondary"
			sx={{ fontWeight: 700, letterSpacing: 1.2, mb: 1.5, display: "block" }}
		>
			{children}
		</Typography>
	);
}

// ── Styled Table ───────────────────────────────────────────────────────────────
function StyledTableHead({ children }: { children: React.ReactNode }) {
	const theme = useTheme();
	return (
		<TableHead>
			<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>{children}</TableRow>
		</TableHead>
	);
}

// ── Main Page ──────────────────────────────────────────────────────────────────
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

	if (loading)
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
				<CircularProgress />
			</Box>
		);

	if (error)
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">{error}</Alert>
			</Box>
		);

	if (!stats) return null;

	// ── Chart configs ────────────────────────────────────────────────────────────
	const baseChart = { toolbar: { show: false } };

	const weeklyChartOptions = {
		chart: { ...baseChart, type: "line" as const, zoom: { enabled: false } },
		colors: [theme.palette.primary.main, theme.palette.success.main],
		stroke: { curve: "smooth" as const, width: 2.5 },
		grid: { borderColor: theme.palette.divider, strokeDashArray: 4 },
		xaxis: {
			categories: stats.weeklyStats.days,
			labels: { style: { colors: theme.palette.text.secondary, fontSize: "12px" } },
		},
		yaxis: {
			title: { text: "Assignments", style: { color: theme.palette.text.secondary } },
		},
		tooltip: { shared: true, intersect: false },
		legend: { position: "top" as const },
	};

	const weeklyChartSeries = [
		{ name: "Total Assignments", data: stats.weeklyStats.assignmentsPerDay },
		{ name: "Completed", data: stats.weeklyStats.completedAssignmentsPerDay },
	];

	const occupancyChartOptions = {
		chart: { ...baseChart, type: "bar" as const },
		colors: [theme.palette.warning.main],
		plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
		grid: { borderColor: theme.palette.divider, strokeDashArray: 4 },
		xaxis: {
			categories: stats.weeklyStats.days,
			labels: { style: { colors: theme.palette.text.secondary, fontSize: "12px" } },
		},
		yaxis: {
			max: 100,
			title: { text: "Occupancy (%)", style: { color: theme.palette.text.secondary } },
		},
		tooltip: { y: { formatter: (v: number) => `${v}%` } },
	};

	const occupancyChartSeries = [{ name: "Occupancy Rate", data: stats.weeklyStats.averageOccupancyPerDay }];

	const utilizationChartOptions = {
		chart: { ...baseChart, type: "donut" as const },
		colors: [theme.palette.success.main, theme.palette.grey[300]],
		labels: ["In Service", "Idle"],
		legend: { position: "bottom" as const },
		plotOptions: { pie: { donut: { size: "68%" } } },
		dataLabels: { style: { fontSize: "13px" } },
	};

	const utilizationChartSeries = [stats.busUtilization.busesInService, stats.busUtilization.busesIdle];

	// ── Shared table cell style ──────────────────────────────────────────────────
	const headCell = {
		fontWeight: 700,
		fontSize: "0.75rem",
		color: "text.secondary",
		textTransform: "uppercase" as const,
		letterSpacing: 0.5,
	};

	return (
		<Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
			{/* ── Page Header ── */}
			<Stack direction="row" alignItems="center" justifyContent="space-between" mb={4}>
				<Box>
					<Typography variant="h4" fontWeight={700}>
						Dashboard
					</Typography>
					<Typography variant="body2" color="text.secondary" mt={0.5}>
						Welcome back! Here's what's happening with your transport system today.
					</Typography>
				</Box>
				<Chip
					label={new Date().toLocaleDateString("en-US", {
						weekday: "long",
						month: "short",
						day: "numeric",
					})}
					variant="outlined"
					size="medium"
					sx={{ fontWeight: 600 }}
				/>
			</Stack>

			{/* ── Stat Cards ── */}
			<SectionLabel>Overview</SectionLabel>
			<Grid container spacing={2.5} mb={4}>
				<Grid size={{ lg: 3, sm: 6, xs: 12 }}>
					<StatCard
						label="Total Buses"
						value={stats.totalBuses}
						chips={[
							{ label: `${stats.activeBuses} Active`, color: "success" },
							{ label: `${stats.inactiveBuses} Inactive`, color: "error" },
						]}
						caption={`${stats.activeBusesPercentage}% active rate`}
						icon={<Bus size={26} weight="duotone" color={theme.palette.primary.main} />}
						iconBg={alpha(theme.palette.primary.main, 0.12)}
					/>
				</Grid>
				<Grid size={{ lg: 3, sm: 6, xs: 12 }}>
					<StatCard
						label="Total Drivers"
						value={stats.totalDrivers}
						chips={[
							{ label: `${stats.activeDrivers} Active`, color: "success" },
							{ label: `${stats.inactiveDrivers} Inactive`, color: "error" },
						]}
						caption={`${stats.activeDriversPercentage}% active rate`}
						icon={<UserRectangleIcon size={26} weight="duotone" color={theme.palette.secondary.main} />}
						iconBg={alpha(theme.palette.secondary.main, 0.12)}
					/>
				</Grid>
				<Grid size={{ lg: 3, sm: 6, xs: 12 }}>
					<StatCard
						label="Today's Assignments"
						value={stats.todayTotalAssignments}
						chips={[
							{ label: `${stats.todayCompletedAssignments} Done`, color: "success" },
							{ label: `${stats.todayInProgressAssignments} Active`, color: "warning" },
							{ label: `${stats.todayScheduledAssignments} Scheduled`, color: "info" },
						]}
						caption={`${stats.todayCompletionRate}% completion rate`}
						icon={<ClipboardTextIcon size={26} weight="duotone" color={theme.palette.warning.main} />}
						iconBg={alpha(theme.palette.warning.main, 0.12)}
					/>
				</Grid>
				<Grid size={{ lg: 3, sm: 6, xs: 12 }}>
					<StatCard
						label="Today's Attendance"
						value={`${stats.attendance.attendancePercentage}%`}
						chips={[
							{ label: `${stats.attendance.present} Present`, color: "success" },
							{ label: `${stats.attendance.late} Late`, color: "warning" },
							{ label: `${stats.attendance.absent} Absent`, color: "error" },
						]}
						caption={`${stats.attendance.present + stats.attendance.late} / ${stats.attendance.total} on time`}
						icon={<NoteIcon size={26} weight="duotone" color={theme.palette.info.main} />}
						iconBg={alpha(theme.palette.info.main, 0.12)}
					/>
				</Grid>
			</Grid>

			{/* ── Charts Row 1 ── */}
			<SectionLabel>Analytics</SectionLabel>
			<Grid container spacing={2.5} mb={3}>
				<Grid size={{ lg: 8, xs: 12 }}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
						<CardHeader title="Weekly Assignment Trends" titleTypographyProps={{ fontWeight: 700, variant: "h6" }} />
						<Divider />
						<CardContent sx={{ pt: 2 }}>
							<Chart options={weeklyChartOptions} series={weeklyChartSeries} type="line" height={320} />
						</CardContent>
					</Card>
				</Grid>

				<Grid size={{ lg: 4, xs: 12 }}>
					<Card
						sx={{
							height: "100%",
							borderRadius: 3,
							boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
						}}
					>
						<CardHeader title="Bus Utilization" titleTypographyProps={{ fontWeight: 700, variant: "h6" }} />
						<Divider />
						<CardContent>
							<Chart options={utilizationChartOptions} series={utilizationChartSeries} type="donut" height={250} />
							<Divider sx={{ my: 2 }} />
							<Stack spacing={0.5} alignItems="center">
								<Typography variant="body2" color="text.secondary">
									Utilization Rate: <strong>{stats.busUtilization.utilizationRate}%</strong>
								</Typography>
								<Typography variant="caption" color="text.secondary" align="center">
									{stats.busUtilization.busesInService} of {stats.busUtilization.totalBuses} buses active (last 30 days)
								</Typography>
							</Stack>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* ── Occupancy Chart ── */}
			<Grid container spacing={2.5} mb={4}>
				<Grid size={{ xs: 12 }}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
						<CardHeader
							title="Daily Occupancy Rate"
							subheader="Last 7 days — based on completed vs total time slots"
							titleTypographyProps={{ fontWeight: 700, variant: "h6" }}
						/>
						<Divider />
						<CardContent sx={{ pt: 2 }}>
							<Chart options={occupancyChartOptions} series={occupancyChartSeries} type="bar" height={300} />
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* ── Tables ── */}
			<SectionLabel>Assignments</SectionLabel>
			<Grid container spacing={2.5} mb={3}>
				{/* Most Used Buses */}
				<Grid size={{ lg: 6, xs: 12 }}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
						<CardHeader title="Most Used Buses" titleTypographyProps={{ fontWeight: 700, variant: "h6" }} />
						<Divider />
						<TableContainer>
							<Table size="small">
								<StyledTableHead>
									<TableCell sx={headCell}>Bus No.</TableCell>
									<TableCell align="center" sx={headCell}>
										Assignments
									</TableCell>
									<TableCell align="center" sx={headCell}>
										Time Slots
									</TableCell>
									<TableCell align="center" sx={headCell}>
										Completed
									</TableCell>
									<TableCell align="center" sx={headCell}>
										Success
									</TableCell>
								</StyledTableHead>
								<TableBody>
									{stats.busUtilization.topUsedBuses.map((bus) => (
										<TableRow key={bus.busId} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
											<TableCell>
												<Typography variant="body2" fontWeight={600}>
													{bus.busNumber}
												</Typography>
											</TableCell>
											<TableCell align="center">{bus.totalAssignments}</TableCell>
											<TableCell align="center">{bus.totalTimeSlots}</TableCell>
											<TableCell align="center">{bus.completedTimeSlots}</TableCell>
											<TableCell align="center">
												<Chip
													label={
														bus.totalTimeSlots > 0
															? `${Math.round((bus.completedTimeSlots / bus.totalTimeSlots) * 100)}%`
															: "0%"
													}
													size="small"
													color="success"
													variant="outlined"
												/>
											</TableCell>
										</TableRow>
									))}
									{stats.busUtilization.topUsedBuses.length === 0 && (
										<TableRow>
											<TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
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
				<Grid size={{ lg: 6, xs: 12 }}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
						<CardHeader title="Upcoming Assignments" titleTypographyProps={{ fontWeight: 700, variant: "h6" }} />
						<Divider />
						<TableContainer>
							<Table size="small">
								<StyledTableHead>
									<TableCell sx={headCell}>Bus</TableCell>
									<TableCell sx={headCell}>Route</TableCell>
									<TableCell sx={headCell}>Driver</TableCell>
									<TableCell sx={headCell}>Date</TableCell>
									<TableCell sx={headCell}>Time</TableCell>
									<TableCell align="center" sx={headCell}>
										Slots
									</TableCell>
								</StyledTableHead>
								<TableBody>
									{stats.upcomingAssignments.map((a) => (
										<TableRow key={a.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
											<TableCell>
												<Typography variant="body2" fontWeight={600}>
													{a.busNumber}
												</Typography>
											</TableCell>
											<TableCell>{a.routeName}</TableCell>
											<TableCell>{a.driverName}</TableCell>
											<TableCell>{a.serviceDate}</TableCell>
											<TableCell>{a.firstSlotStart}</TableCell>
											<TableCell align="center">
												<Chip label={a.totalSlots} size="small" variant="outlined" />
											</TableCell>
										</TableRow>
									))}
									{stats.upcomingAssignments.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
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
			<Grid container spacing={2.5}>
				<Grid size={{ xs: 12 }}>
					<Card sx={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
						<CardHeader title="Recent Assignments" titleTypographyProps={{ fontWeight: 700, variant: "h6" }} />
						<Divider />
						<TableContainer>
							<Table size="small">
								<StyledTableHead>
									<TableCell sx={headCell}>Bus</TableCell>
									<TableCell sx={headCell}>Route</TableCell>
									<TableCell sx={headCell}>Driver</TableCell>
									<TableCell sx={headCell}>Date</TableCell>
									<TableCell sx={headCell}>Time Range</TableCell>
									<TableCell align="center" sx={headCell}>
										Status
									</TableCell>
								</StyledTableHead>
								<TableBody>
									{stats.recentAssignments.map((a) => (
										<TableRow key={a.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
											<TableCell>
												<Typography variant="body2" fontWeight={600}>
													{a.busNumber}
												</Typography>
											</TableCell>
											<TableCell>{a.routeName}</TableCell>
											<TableCell>{a.driverName}</TableCell>
											<TableCell>{a.serviceDate}</TableCell>
											<TableCell>{a.timeRange}</TableCell>
											<TableCell align="center">
												<Chip label={a.status} size="small" color={statusColorMap[a.status] || "default"} />
											</TableCell>
										</TableRow>
									))}
									{stats.recentAssignments.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
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
