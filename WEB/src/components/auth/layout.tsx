import * as React from "react";
import RouterLink from "next/link";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { paths } from "@/paths";
import { DynamicLogo } from "@/components/core/logo";

export interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps): React.JSX.Element {
	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	return (
		<Box
			sx={{
				display: { xs: "flex", lg: "grid" },
				flexDirection: "column",
				gridTemplateColumns: "1fr 1fr",
				minHeight: "100%",
			}}
		>
			<Box sx={{ display: "flex", flex: "1 1 auto", flexDirection: "column" }}>
				<Box sx={{ p: 3 }}>
					<Box component={RouterLink} href={paths.home} sx={{ display: "inline-block", fontSize: 0 }}>
						{/* <DynamicLogo colorDark="light" colorLight="dark" height={32} width={122} /> */}
					</Box>
				</Box>

				{/* Demo Credentials Section */}
				<Box sx={{ px: 3, pt: 0, pb: 2 }}>
					<Paper
						elevation={0}
						sx={{
							bgcolor: "rgba(21, 183, 158, 0.08)",
							border: "1px solid rgba(21, 183, 158, 0.2)",
							borderRadius: 2,
							p: 2,
						}}
					>
						<Typography variant="subtitle2" sx={{ color: "#15b79e", mb: 1, fontWeight: 600 }}>
							🔐 Demo Credentials
						</Typography>
						<Stack spacing={1}>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<Box>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										Email:
									</Typography>
									<Typography variant="body2" sx={{ fontFamily: "monospace", ml: 1, display: "inline-block" }}>
										admin@transport.local
									</Typography>
								</Box>
							</Box>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<Box>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										Password:
									</Typography>
									<Typography variant="body2" sx={{ fontFamily: "monospace", ml: 1, display: "inline-block" }}>
										Admin@123
									</Typography>
								</Box>
							</Box>
						</Stack>
					</Paper>
				</Box>

				<Box sx={{ alignItems: "center", display: "flex", flex: "1 1 auto", justifyContent: "center", p: 3 }}>
					<Box sx={{ maxWidth: "450px", width: "100%" }}>{children}</Box>
				</Box>
			</Box>

			<Box
				sx={{
					alignItems: "center",
					background: "#0a2f1f",
					color: "var(--mui-palette-common-white)",
					display: { xs: "none", lg: "flex" },
					justifyContent: "center",
					p: 3,
				}}
			>
				<Stack spacing={2}>
					<Stack spacing={1}>
						<Typography color="inherit" sx={{ fontSize: "24px", lineHeight: "32px", textAlign: "center" }} variant="h1">
							Welcome to{" "}
							<Box component="span" sx={{ color: "#15b79e" }}>
								The UOL TMS Admin Dashboard
							</Box>
						</Typography>
					</Stack>
					<Box sx={{ display: "flex", justifyContent: "center" }}>
						<Box
							component="img"
							alt="Widgets"
							src="/assets/banner.jpg"
							sx={{ height: "auto", width: "100%", maxWidth: "600px" }}
						/>
					</Box>
				</Stack>
			</Box>
		</Box>
	);
}
