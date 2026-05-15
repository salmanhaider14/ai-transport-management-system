export const paths = {
	home: "/",
	auth: { signIn: "/auth/sign-in", signUp: "/auth/sign-up", resetPassword: "/auth/reset-password" },
	dashboard: {
		overview: "/dashboard",
		account: "/dashboard/account",
		settings: "/dashboard/settings",
		buses: "/dashboard/buses",
		routes: "/dashboard/routes",
		drivers: "/dashboard/drivers",
		bus_assignments: "/dashboard/bus-assignments",
		drivers_attendance: "/dashboard/drivers-attendance",
		students: "/dashboard/students",
	},
	errors: { notFound: "/errors/not-found" },
} as const;
