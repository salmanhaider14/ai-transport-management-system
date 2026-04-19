import type { NavItemConfig } from "@/types/nav";
import { paths } from "@/paths";

export const navItems = [
	{ key: "overview", title: "Overview", href: paths.dashboard.overview, icon: "chart-pie" },
	{ key: "buses", title: "Buses", href: paths.dashboard.buses, icon: "bus" },
	{ key: "routes", title: "Routes", href: paths.dashboard.routes, icon: "road-horizon" },
	{ key: "drivers", title: "Drivers", href: paths.dashboard.drivers, icon: "user-rectangle" },
	{ key: "bus_assignments", title: "Bus Assignments", href: paths.dashboard.bus_assignments, icon: "clipboard-text" },
	{ key: "customers", title: "Customers", href: paths.dashboard.customers, icon: "users" },
	{ key: "integrations", title: "Integrations", href: paths.dashboard.integrations, icon: "plugs-connected" },
	{ key: "settings", title: "Settings", href: paths.dashboard.settings, icon: "gear-six" },
	{ key: "account", title: "Account", href: paths.dashboard.account, icon: "user" },
	{ key: "error", title: "Error", href: paths.errors.notFound, icon: "x-square" },
] satisfies NavItemConfig[];
