export const paths = {
	home: "/",
	auth: { signIn: "/auth/sign-in", signUp: "/auth/sign-up", resetPassword: "/auth/reset-password" },
	dashboard: {
		overview: "/dashboard",
		account: "/dashboard/account",
		customers: "/dashboard/customers",
		integrations: "/dashboard/integrations",
		settings: "/dashboard/settings",
		buses: "/dashboard/buses",
		routes: "/dashboard/routes",
		drivers: "/dashboard/drivers",
		bus_assignments: "/dashboard/bus-assignments",
	},
	errors: { notFound: "/errors/not-found" },
} as const;
