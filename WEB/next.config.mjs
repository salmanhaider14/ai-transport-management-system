/** @type {import('next').NextConfig} */
const config = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	experimental: {
		optimizePackageImports: [
			"@mui/material",
			"@mui/system",
			"@mui/lab",
			"@mui/icons-material",
			"@phosphor-icons/react",
		],
	},
	typescript: {
		ignoreBuildErrors: true,
	},
};

export default config;
