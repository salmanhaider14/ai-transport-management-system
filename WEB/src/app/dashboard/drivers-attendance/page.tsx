"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	CardHeader,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers";
import { Calendar, Eye, PencilSimple, Plus, TrashSimple, X } from "@phosphor-icons/react";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { z as zod } from "zod";

import { config } from "@/config";
import {
	attendanceApi,
	AttendanceStatus,
	DriverAttendance,
	MarkAttendanceRequest,
	UpdateAttendanceRequest,
} from "@/lib/api/attendance";
import { DriverProfile, driversApi } from "@/lib/api/drivers";

const markAttendanceSchema = zod
	.object({
		driverProfileId: zod.number().min(1, "Driver is required"),
		date: zod.string().min(1, "Date is required"),
		status: zod.nativeEnum(AttendanceStatus, { required_error: "Status is required" }),
		checkInTime: zod.string().optional(),
		checkOutTime: zod.string().optional(),
		remarks: zod.string().optional(),
	})
	.refine(
		(data) => {
			if (data.checkInTime && data.checkOutTime) {
				return data.checkOutTime > data.checkInTime;
			}
			return true;
		},
		{
			message: "Check-out time must be after check-in time",
			path: ["checkOutTime"],
		}
	);

const updateAttendanceSchema = zod
	.object({
		status: zod.nativeEnum(AttendanceStatus).optional(),
		checkInTime: zod.string().optional(),
		checkOutTime: zod.string().optional(),
		remarks: zod.string().optional(),
	})
	.refine(
		(data) => {
			if (data.checkInTime && data.checkOutTime) {
				return data.checkOutTime > data.checkInTime;
			}
			return true;
		},
		{
			message: "Check-out time must be after check-in time",
			path: ["checkOutTime"],
		}
	);

type MarkAttendanceFormData = zod.infer<typeof markAttendanceSchema>;
type UpdateAttendanceFormData = zod.infer<typeof updateAttendanceSchema>;

const statusColorMap: Record<AttendanceStatus, "default" | "primary" | "success" | "error" | "warning" | "info"> = {
	[AttendanceStatus.Present]: "success",
	[AttendanceStatus.Absent]: "error",
	[AttendanceStatus.Late]: "warning",
	[AttendanceStatus.OnLeave]: "info",
};

export default function AttendancePage() {
	const [drivers, setDrivers] = useState<DriverProfile[]>([]);
	const [attendances, setAttendances] = useState<DriverAttendance[]>([]);
	const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingAttendance, setLoadingAttendance] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [markDialogOpen, setMarkDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingAttendance, setEditingAttendance] = useState<DriverAttendance | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [fromDate, setFromDate] = useState<string>(dayjs().startOf("month").format("YYYY-MM-DD"));
	const [toDate, setToDate] = useState<string>(dayjs().format("YYYY-MM-DD"));

	const {
		control: markControl,
		handleSubmit: handleMarkSubmit,
		reset: resetMark,
		setError: setMarkError,
		watch: watchMark,
		formState: { errors: markErrors },
	} = useForm<MarkAttendanceFormData>({
		resolver: zodResolver(markAttendanceSchema),
		defaultValues: {
			driverProfileId: 0,
			date: dayjs().format("YYYY-MM-DD"),
			status: AttendanceStatus.Present,
			checkInTime: "",
			checkOutTime: "",
			remarks: "",
		},
	});

	const {
		control: editControl,
		handleSubmit: handleEditSubmit,
		reset: resetEdit,
		setError: setEditError,
		formState: { errors: editErrors },
	} = useForm<UpdateAttendanceFormData>({
		resolver: zodResolver(updateAttendanceSchema),
		defaultValues: {
			status: AttendanceStatus.Present,
			checkInTime: "",
			checkOutTime: "",
			remarks: "",
		},
	});

	const fetchDrivers = useCallback(async () => {
		try {
			setLoading(true);
			const data = await driversApi.getAll(true);
			setDrivers(data);
			setError(null);
			if (data.length > 0 && !selectedDriverId) {
				setSelectedDriverId(data[0].id);
			}
		} catch (err: any) {
			setError(err.message || "Failed to load drivers");
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchAttendance = useCallback(async () => {
		if (!selectedDriverId) return;
		try {
			setLoadingAttendance(true);
			const data = await attendanceApi.getByDriver(selectedDriverId, fromDate, toDate);
			setAttendances(data);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to load attendance");
		} finally {
			setLoadingAttendance(false);
		}
	}, [selectedDriverId, fromDate, toDate]);

	useEffect(() => {
		fetchDrivers();
	}, [fetchDrivers]);

	useEffect(() => {
		if (selectedDriverId) {
			fetchAttendance();
		}
	}, [selectedDriverId, fromDate, toDate, fetchAttendance]);

	const handleDriverChange = (driverId: number) => {
		setSelectedDriverId(driverId);
	};

	const handleOpenMarkAttendance = () => {
		resetMark({
			driverProfileId: selectedDriverId || 0,
			date: dayjs().format("YYYY-MM-DD"),
			status: AttendanceStatus.Present,
			checkInTime: "",
			checkOutTime: "",
			remarks: "",
		});
		setMarkDialogOpen(true);
	};

	const handleOpenEditAttendance = (attendance: DriverAttendance) => {
		setEditingAttendance(attendance);
		resetEdit({
			status: attendance.status,
			checkInTime: attendance.checkInTime?.slice(0, 5) || "",
			checkOutTime: attendance.checkOutTime?.slice(0, 5) || "",
			remarks: attendance.remarks || "",
		});
		setEditDialogOpen(true);
	};

	const onMarkSubmit = async (data: MarkAttendanceFormData) => {
		setSubmitting(true);
		try {
			await attendanceApi.mark({
				driverProfileId: data.driverProfileId,
				date: data.date,
				status: data.status,
				checkInTime: data.checkInTime || undefined,
				checkOutTime: data.checkOutTime || undefined,
				remarks: data.remarks || undefined,
			} as MarkAttendanceRequest);
			setMarkDialogOpen(false);
			fetchAttendance();
		} catch (err: any) {
			if (err.message?.includes("already marked")) {
				setMarkError("root", { message: "Attendance already marked for this date" });
			} else {
				setMarkError("root", { message: err.message || "Failed to mark attendance" });
			}
		} finally {
			setSubmitting(false);
		}
	};

	const onEditSubmit = async (data: UpdateAttendanceFormData) => {
		if (!editingAttendance) return;
		setSubmitting(true);
		try {
			await attendanceApi.update(editingAttendance.id, {
				status: data.status,
				checkInTime: data.checkInTime || undefined,
				checkOutTime: data.checkOutTime || undefined,
				remarks: data.remarks || undefined,
			} as UpdateAttendanceRequest);
			setEditDialogOpen(false);
			fetchAttendance();
		} catch (err: any) {
			setEditError("root", { message: err.message || "Failed to update attendance" });
		} finally {
			setSubmitting(false);
		}
	};

	const columns: GridColDef[] = [
		{
			field: "date",
			headerName: "Date",
			flex: 1,
			minWidth: 110,
			valueFormatter: (value: string) => dayjs(value).format("MMM DD, YYYY"),
		},
		{
			field: "status",
			headerName: "Status",
			flex: 0.8,
			minWidth: 100,
			renderCell: (params: GridRenderCellParams) => (
				<Chip label={params.value} color={statusColorMap[params.value as AttendanceStatus]} size="small" />
			),
		},
		{
			field: "checkInTime",
			headerName: "Check In",
			flex: 0.8,
			minWidth: 90,
			valueGetter: (params: any) => params?.slice(0, 5) || "-",
		},
		{
			field: "checkOutTime",
			headerName: "Check Out",
			flex: 0.8,
			minWidth: 90,
			valueGetter: (params: any) => params?.slice(0, 5) || "-",
		},
		{ field: "remarks", headerName: "Remarks", flex: 1.5, minWidth: 150, valueGetter: (params) => params || "-" },
		{
			field: "actions",
			headerName: "Actions",
			flex: 0.6,
			minWidth: 80,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Tooltip title="Edit">
					<IconButton onClick={() => handleOpenEditAttendance(params.row as DriverAttendance)} size="small">
						<PencilSimple fontSize={18} />
					</IconButton>
				</Tooltip>
			),
		},
	];

	useEffect(() => {
		document.title = `Attendance | Dashboard | ${config.site.name}`;
	}, []);

	const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

	return (
		<Box sx={{ p: 3 }}>
			<Card>
				<CardHeader
					title="Driver Attendance"
					action={
						<Button variant="contained" startIcon={<Plus fontSize={18} />} onClick={handleOpenMarkAttendance}>
							Mark Attendance
						</Button>
					}
				/>
				<Divider />
				<CardContent>
					{error && (
						<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
							{error}
						</Alert>
					)}

					{/* Filters */}
					<Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }} flexWrap="wrap">
						<FormControl sx={{ minWidth: 200 }}>
							<InputLabel>Select Driver</InputLabel>
							<Select
								value={selectedDriverId || ""}
								onChange={(e) => handleDriverChange(e.target.value as number)}
								label="Select Driver"
								disabled={loading}
							>
								{drivers.map((driver) => (
									<MenuItem key={driver.id} value={driver.id}>
										{driver.licenseNumber} - {driver.phoneNumber}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<DatePicker
							label="From Date"
							value={fromDate ? dayjs(fromDate) : null}
							onChange={(date) => setFromDate(date?.format("YYYY-MM-DD") || "")}
							slotProps={{ textField: { size: "small", sx: { width: 150 } } }}
						/>

						<DatePicker
							label="To Date"
							value={toDate ? dayjs(toDate) : null}
							onChange={(date) => setToDate(date?.format("YYYY-MM-DD") || "")}
							slotProps={{ textField: { size: "small", sx: { width: 150 } } }}
						/>

						<Button variant="outlined" onClick={fetchAttendance} disabled={loadingAttendance}>
							Refresh
						</Button>
					</Stack>

					{/* Summary Stats */}
					{selectedDriver && attendances.length > 0 && (
						<Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
							<Chip
								label={`Present: ${attendances.filter((a) => a.status === AttendanceStatus.Present).length}`}
								color="success"
							/>
							<Chip
								label={`Late: ${attendances.filter((a) => a.status === AttendanceStatus.Late).length}`}
								color="warning"
							/>
							<Chip
								label={`Absent: ${attendances.filter((a) => a.status === AttendanceStatus.Absent).length}`}
								color="error"
							/>
							<Chip
								label={`On Leave: ${attendances.filter((a) => a.status === AttendanceStatus.OnLeave).length}`}
								color="info"
							/>
							<Chip label={`Total: ${attendances.length}`} variant="outlined" />
							<Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
								{selectedDriver.licenseNumber} - {selectedDriver.phoneNumber}
							</Typography>
						</Stack>
					)}

					{loadingAttendance ? (
						<Box display="flex" justifyContent="center" py={4}>
							<CircularProgress />
						</Box>
					) : (
						<DataGrid
							rows={attendances}
							columns={columns}
							initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
							pageSizeOptions={[10, 25, 50]}
							disableRowSelectionOnClick
							autoHeight
							sx={{ minHeight: 400, width: "100%" }}
						/>
					)}

					{!loadingAttendance && attendances.length === 0 && selectedDriverId && (
						<Alert severity="info">No attendance records found for the selected driver and date range.</Alert>
					)}
				</CardContent>
			</Card>

			{/* Mark Attendance Dialog */}
			<Dialog open={markDialogOpen} onClose={() => !submitting && setMarkDialogOpen(false)} maxWidth="sm" fullWidth>
				<form onSubmit={handleMarkSubmit(onMarkSubmit)}>
					<DialogTitle>Mark Driver Attendance</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<FormControl fullWidth required error={!!markErrors.driverProfileId}>
								<InputLabel>Driver</InputLabel>
								<Controller
									name="driverProfileId"
									control={markControl}
									render={({ field }) => (
										<FormControl fullWidth required error={!!markErrors.driverProfileId}>
											<Select {...field} label="Driver" disabled={submitting} value={field.value || ""}>
												{drivers.map((driver) => (
													<MenuItem key={driver.id} value={driver.id}>
														{driver.licenseNumber} - {driver.phoneNumber}
													</MenuItem>
												))}
											</Select>
										</FormControl>
									)}
								/>
							</FormControl>

							<Controller
								name="date"
								control={markControl}
								render={({ field }) => (
									<DatePicker
										label="Date"
										value={field.value ? dayjs(field.value) : null}
										onChange={(date) => field.onChange(date?.format("YYYY-MM-DD"))}
										maxDate={dayjs()}
										slotProps={{ textField: { fullWidth: true, required: true, error: !!markErrors.date } }}
									/>
								)}
							/>

							<Controller
								name="status"
								control={markControl}
								render={({ field }) => (
									<FormControl fullWidth required error={!!markErrors.status}>
										<InputLabel>Status</InputLabel>
										<Select {...field} label="Status">
											{Object.values(AttendanceStatus).map((status) => (
												<MenuItem key={status} value={status}>
													{status}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								)}
							/>

							<Controller
								name="checkInTime"
								control={markControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Check In Time (Optional)"
										type="time"
										fullWidth
										InputLabelProps={{ shrink: true }}
									/>
								)}
							/>

							<Controller
								name="checkOutTime"
								control={markControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Check Out Time (Optional)"
										type="time"
										fullWidth
										InputLabelProps={{ shrink: true }}
										error={!!markErrors.checkOutTime}
										helperText={markErrors.checkOutTime?.message}
									/>
								)}
							/>

							<Controller
								name="remarks"
								control={markControl}
								render={({ field }) => <TextField {...field} label="Remarks (Optional)" fullWidth multiline rows={2} />}
							/>

							{markErrors.root && <Alert severity="error">{markErrors.root.message}</Alert>}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setMarkDialogOpen(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" variant="contained" disabled={submitting}>
							{submitting ? <CircularProgress size={24} /> : "Mark Attendance"}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			{/* Edit Attendance Dialog */}
			<Dialog open={editDialogOpen} onClose={() => !submitting && setEditDialogOpen(false)} maxWidth="sm" fullWidth>
				<form onSubmit={handleEditSubmit(onEditSubmit)}>
					<DialogTitle>Edit Attendance</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Typography variant="body2" color="text.secondary">
								Date: {editingAttendance && dayjs(editingAttendance.date).format("MMMM DD, YYYY")}
							</Typography>

							<Controller
								name="status"
								control={editControl}
								render={({ field }) => (
									<FormControl fullWidth required>
										<InputLabel>Status</InputLabel>
										<Select {...field} label="Status">
											{Object.values(AttendanceStatus).map((status) => (
												<MenuItem key={status} value={status}>
													{status}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								)}
							/>

							<Controller
								name="checkInTime"
								control={editControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Check In Time"
										type="time"
										fullWidth
										InputLabelProps={{ shrink: true }}
									/>
								)}
							/>

							<Controller
								name="checkOutTime"
								control={editControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Check Out Time"
										type="time"
										fullWidth
										InputLabelProps={{ shrink: true }}
										error={!!editErrors.checkOutTime}
										helperText={editErrors.checkOutTime?.message}
									/>
								)}
							/>

							<Controller
								name="remarks"
								control={editControl}
								render={({ field }) => <TextField {...field} label="Remarks" fullWidth multiline rows={2} />}
							/>

							{editErrors.root && <Alert severity="error">{editErrors.root.message}</Alert>}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setEditDialogOpen(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" variant="contained" disabled={submitting}>
							{submitting ? <CircularProgress size={24} /> : "Update"}
						</Button>
					</DialogActions>
				</form>
			</Dialog>
		</Box>
	);
}
