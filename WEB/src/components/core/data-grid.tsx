import dynamic from "next/dynamic";

export const DataGrid = dynamic(() => import("@mui/x-data-grid").then((m) => ({ default: m.DataGrid })), {
	ssr: false,
	loading: () => null,
});
export type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
