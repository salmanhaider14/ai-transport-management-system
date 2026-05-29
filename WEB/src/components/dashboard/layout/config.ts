import type { NavItemConfig } from "@/types/nav";
import { paths } from "@/paths";

export const navItems = [
	{ key: "overview", title: "Overview", href: paths.dashboard.overview, icon: "chart-pie" },
	{ key: "buses", title: "Buses", href: paths.dashboard.buses, icon: "bus" },
	{ key: "routes", title: "Routes", href: paths.dashboard.routes, icon: "road-horizon" },
	{ key: "drivers", title: "Drivers", href: paths.dashboard.drivers, icon: "user-rectangle" },
	{ key: "bus_assignments", title: "Bus Assignments", href: paths.dashboard.bus_assignments, icon: "clipboard-text" },
	{
		key: "drivers_attendance",
		title: "Drivers Attendance",
		href: paths.dashboard.drivers_attendance,
		icon: "user-check",
	},
	{ key: "students", title: "Students", href: paths.dashboard.students, icon: "student" },
] satisfies NavItemConfig[];
