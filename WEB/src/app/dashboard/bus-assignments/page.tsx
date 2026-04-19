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
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z as zod } from "zod";

import { config } from "@/config";
import {
	assignmentsApi,
	AssignmentStatus,
	BusAssignment,
	BusAssignmentSummary,
	CreateAssignmentRequest,
	TimeSlot,
	TimeSlotStatus,
	UpdateAssignmentRequest,
} from "@/lib/api/assignments";
import { Bus, busesApi } from "@/lib/api/buses";
import { DriverProfile, driversApi } from "@/lib/api/drivers";
import { Route, routesApi } from "@/lib/api/routes";

const timeSlotSchema = zod
	.object({
		slotNumber: zod.number().min(1, "Slot number required"),
		startTime: zod.string().min(1, "Start time required"),
		endTime: zod.string().min(1, "End time required"),
		notes: zod.string().optional(),
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "End time must be after start time",
		path: ["endTime"],
	});

const createAssignmentSchema = zod.object({
	busId: zod.number().min(1, "Bus is required"),
	routeId: zod.number().min(1, "Route is required"),
	driverProfileId: zod.number().min(1, "Driver is required"),
	serviceDate: zod.string().min(1, "Service date is required"),
	timeSlots: zod.array(timeSlotSchema).min(1, "At least one time slot is required"),
});

type CreateAssignmentFormData = zod.infer<typeof createAssignmentSchema>;

const statusColorMap: Record<AssignmentStatus, "default" | "primary" | "success" | "error" | "warning" | "info"> = {
	[AssignmentStatus.Draft]: "default",
	[AssignmentStatus.Scheduled]: "info",
	[AssignmentStatus.InProgress]: "warning",
	[AssignmentStatus.PartiallyCompleted]: "primary",
	[AssignmentStatus.Completed]: "success",
	[AssignmentStatus.Cancelled]: "error",
};

export default function AssignmentsPage() {
	const [assignments, setAssignments] = useState<BusAssignmentSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [viewDialogOpen, setViewDialogOpen] = useState(false);
	const [selectedAssignment, setSelectedAssignment] = useState<BusAssignment | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancellingAssignment, setCancellingAssignment] = useState<BusAssignmentSummary | null>(null);

	// Dropdown data
	const [buses, setBuses] = useState<Bus[]>([]);
	const [routes, setRoutes] = useState<Route[]>([]);
	const [drivers, setDrivers] = useState<DriverProfile[]>([]);
	const [loadingDropdowns, setLoadingDropdowns] = useState(false);

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingAssignment, setEditingAssignment] = useState<BusAssignment | null>(null);
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [editTimeSlots, setEditTimeSlots] = useState<TimeSlot[]>([]);
	const [timeSlotDialogOpen, setTimeSlotDialogOpen] = useState(false);
	const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
	const [deleteTimeSlotDialogOpen, setDeleteTimeSlotDialogOpen] = useState(false);

	// Edit form
	const {
		control: editControl,
		handleSubmit: handleEditSubmit,
		reset: resetEdit,
		setValue: setEditValue,
		setError: setEditError,
		formState: { errors: editErrors },
	} = useForm<{
		busId: number;
		routeId: number;
		driverProfileId: number;
		serviceDate: string;
		status: AssignmentStatus;
	}>({
		defaultValues: {
			busId: 0,
			routeId: 0,
			driverProfileId: 0,
			serviceDate: "",
			status: AssignmentStatus.Scheduled,
		},
	});

	// Time slot edit form
	const {
		control: timeSlotControl,
		handleSubmit: handleTimeSlotSubmit,
		reset: resetTimeSlot,
		setError: setTimeSlotError,
		formState: { errors: timeSlotErrors },
	} = useForm<{
		slotNumber: number;
		startTime: string;
		endTime: string;
		status: TimeSlotStatus;
		actualStartTime?: string;
		actualEndTime?: string;
		notes?: string;
	}>({
		defaultValues: {
			slotNumber: 0,
			startTime: "",
			endTime: "",
			status: TimeSlotStatus.Scheduled,
			actualStartTime: "",
			actualEndTime: "",
			notes: "",
		},
	});

	// Add these handlers
	const handleOpenEdit = async (assignment: BusAssignmentSummary) => {
		try {
			setEditSubmitting(true);
			const fullAssignment = await assignmentsApi.getById(assignment.id);
			setEditingAssignment(fullAssignment);
			setEditTimeSlots(fullAssignment.timeSlots);
			resetEdit({
				busId: fullAssignment.busId,
				routeId: fullAssignment.routeId,
				driverProfileId: fullAssignment.driverProfileId,
				serviceDate: fullAssignment.serviceDate,
				status: fullAssignment.status,
			});
			setEditDialogOpen(true);
		} catch (err: any) {
			setError(err.message || "Failed to load assignment details");
		} finally {
			setEditSubmitting(false);
		}
	};

	const onEditSubmit = async (data: {
		busId: number;
		routeId: number;
		driverProfileId: number;
		serviceDate: string;
		status: AssignmentStatus;
	}) => {
		if (!editingAssignment) return;
		setEditSubmitting(true);
		try {
			await assignmentsApi.update(editingAssignment.id, {
				busId: data.busId,
				routeId: data.routeId,
				driverProfileId: data.driverProfileId,
				serviceDate: data.serviceDate,
				status: data.status,
			});
			setEditDialogOpen(false);
			fetchAssignments();
		} catch (err: any) {
			if (err.message?.includes("already assigned")) {
				setEditError("root", { message: err.message });
			} else {
				setEditError("root", { message: err.message || "Failed to update assignment" });
			}
		} finally {
			setEditSubmitting(false);
		}
	};

	// Time slot handlers
	const handleOpenAddTimeSlot = () => {
		setEditingTimeSlot(null);
		resetTimeSlot({
			slotNumber: editTimeSlots.length + 1,
			startTime: "09:00",
			endTime: "10:00",
			status: TimeSlotStatus.Scheduled,
			actualStartTime: "",
			actualEndTime: "",
			notes: "",
		});
		setTimeSlotDialogOpen(true);
	};

	const handleOpenEditTimeSlot = (slot: TimeSlot) => {
		setEditingTimeSlot(slot);
		resetTimeSlot({
			slotNumber: slot.slotNumber,
			startTime: slot.startTime.slice(0, 5),
			endTime: slot.endTime.slice(0, 5),
			status: slot.status,
			actualStartTime: slot.actualStartTime ? slot.actualStartTime.slice(0, 5) : "",
			actualEndTime: slot.actualEndTime ? slot.actualEndTime.slice(0, 5) : "",
			notes: slot.notes || "",
		});
		setTimeSlotDialogOpen(true);
	};

	const onTimeSlotSubmit = async (data: {
		slotNumber: number;
		startTime: string;
		endTime: string;
		status: TimeSlotStatus;
		actualStartTime?: string;
		actualEndTime?: string;
		notes?: string;
	}) => {
		if (!editingAssignment) return;
		setEditSubmitting(true);
		try {
			if (editingTimeSlot) {
				// Update existing time slot
				await assignmentsApi.updateTimeSlot(editingAssignment.id, editingTimeSlot.id, {
					slotNumber: data.slotNumber,
					startTime: data.startTime,
					endTime: data.endTime,
					status: data.status,
					actualStartTime: data.actualStartTime || undefined,
					actualEndTime: data.actualEndTime || undefined,
					notes: data.notes,
				});
			} else {
				// Add new time slot
				await assignmentsApi.addTimeSlot(editingAssignment.id, {
					slotNumber: data.slotNumber,
					startTime: data.startTime,
					endTime: data.endTime,
					notes: data.notes,
				});
			}
			setTimeSlotDialogOpen(false);
			// Refresh the assignment data
			const refreshedAssignment = await assignmentsApi.getById(editingAssignment.id);

			setEditingAssignment(refreshedAssignment);
			setEditTimeSlots(refreshedAssignment.timeSlots);

			resetEdit({
				busId: refreshedAssignment.busId,
				routeId: refreshedAssignment.routeId,
				driverProfileId: refreshedAssignment.driverProfileId,
				serviceDate: refreshedAssignment.serviceDate,
				status: refreshedAssignment.status,
			});

			fetchAssignments();
		} catch (err: any) {
			setTimeSlotError("root", { message: err.message || "Failed to save time slot" });
		} finally {
			setEditSubmitting(false);
		}
	};

	const handleDeleteTimeSlotClick = (slot: TimeSlot) => {
		setEditingTimeSlot(slot);
		setDeleteTimeSlotDialogOpen(true);
	};

	const handleDeleteTimeSlotConfirm = async () => {
		if (!editingAssignment || !editingTimeSlot) return;
		setEditSubmitting(true);
		try {
			await assignmentsApi.deleteTimeSlot(editingAssignment.id, editingTimeSlot.id);
			setDeleteTimeSlotDialogOpen(false);
			const refreshedAssignment = await assignmentsApi.getById(editingAssignment.id);

			setEditingAssignment(refreshedAssignment);
			setEditTimeSlots(refreshedAssignment.timeSlots);

			resetEdit({
				busId: refreshedAssignment.busId,
				routeId: refreshedAssignment.routeId,
				driverProfileId: refreshedAssignment.driverProfileId,
				serviceDate: refreshedAssignment.serviceDate,
				status: refreshedAssignment.status,
			});

			fetchAssignments();
		} catch (err: any) {
			setError(err.message || "Failed to delete time slot");
			setDeleteTimeSlotDialogOpen(false);
		} finally {
			setEditSubmitting(false);
			setEditingTimeSlot(null);
		}
	};

	const {
		control,
		handleSubmit,
		reset,
		setValue,
		setError: setFormError,
		watch,
		formState: { errors },
	} = useForm<CreateAssignmentFormData>({
		resolver: zodResolver(createAssignmentSchema),
		defaultValues: {
			busId: 0,
			routeId: 0,
			driverProfileId: 0,
			serviceDate: dayjs().format("YYYY-MM-DD"),
			timeSlots: [],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control,
		name: "timeSlots",
	});

	const fetchAssignments = useCallback(async () => {
		try {
			setLoading(true);
			const data = await assignmentsApi.getAll();
			setAssignments(data);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to load assignments");
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchDropdownData = async () => {
		setLoadingDropdowns(true);
		try {
			const [busesData, routesData, driversData] = await Promise.all([
				busesApi.getAll(),
				routesApi.getAll(),
				driversApi.getAll(true),
			]);
			setBuses(busesData);
			setRoutes(routesData);
			setDrivers(driversData);
		} catch (err) {
			console.error("Failed to load dropdown data", err);
		} finally {
			setLoadingDropdowns(false);
		}
	};

	useEffect(() => {
		fetchAssignments();
		fetchDropdownData();
	}, [fetchAssignments]);

	const handleOpenCreate = () => {
		reset({
			busId: 0,
			routeId: 0,
			driverProfileId: 0,
			serviceDate: dayjs().format("YYYY-MM-DD"),
			timeSlots: [],
		});
		setCreateDialogOpen(true);
	};

	const handleOpenView = async (assignment: BusAssignmentSummary) => {
		try {
			setSubmitting(true);

			const fullAssignment = await assignmentsApi.getById(assignment.id);

			setSelectedAssignment(fullAssignment);
			setViewDialogOpen(true);
		} catch (err: any) {
			setError(err.message || "Failed to load assignment details");
		} finally {
			setSubmitting(false);
		}
	};

	const handleCancelClick = (assignment: BusAssignmentSummary) => {
		if (assignment.status === AssignmentStatus.Completed) {
			setError("Cannot cancel a completed assignment.");
			return;
		}
		setCancellingAssignment(assignment);
		setCancelDialogOpen(true);
	};

	const handleCancelConfirm = async () => {
		if (!cancellingAssignment) return;
		setSubmitting(true);
		try {
			await assignmentsApi.cancel(cancellingAssignment.id);
			setCancelDialogOpen(false);
			fetchAssignments();
		} catch (err: any) {
			setError(err.message || "Failed to cancel assignment");
			setCancelDialogOpen(false);
		} finally {
			setSubmitting(false);
			setCancellingAssignment(null);
		}
	};

	const onCreateSubmit = async (data: CreateAssignmentFormData) => {
		setSubmitting(true);
		try {
			const timeSlots = data.timeSlots.map((slot, idx) => ({
				startTime: slot.startTime,
				endTime: slot.endTime,
				slotNumber: idx + 1,
				notes: slot.notes,
			}));

			await assignmentsApi.create({
				busId: data.busId,
				routeId: data.routeId,
				driverProfileId: data.driverProfileId,
				serviceDate: data.serviceDate,
				timeSlots,
			} as CreateAssignmentRequest);
			setCreateDialogOpen(false);
			fetchAssignments();
		} catch (err: any) {
			if (err.message?.includes("already assigned")) {
				setFormError("root", { message: err.message });
			} else {
				setFormError("root", { message: err.message || "Failed to create assignment" });
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleAddTimeSlot = () => {
		append({
			slotNumber: fields.length + 1,
			startTime: "09:00",
			endTime: "10:00",
			notes: "",
		});
	};

	const columns: GridColDef[] = [
		{ field: "id", headerName: "ID", flex: 0.5, minWidth: 80, sortable: true },
		{ field: "busNumber", headerName: "Bus", flex: 1, minWidth: 100, sortable: true },
		{ field: "routeName", headerName: "Route", flex: 1.5, minWidth: 150, sortable: true },
		{ field: "driverName", headerName: "Driver", flex: 1.2, minWidth: 120, sortable: true },
		{
			field: "serviceDate",
			headerName: "Date",
			flex: 1,
			minWidth: 110,
			valueFormatter: (value: string) => dayjs(value).format("MMM DD, YYYY"),
		},
		{
			field: "timeRange",
			headerName: "Time",
			flex: 1.2,
			minWidth: 130,
			valueGetter: (value, row) => {
				const r = row as BusAssignmentSummary;
				if (r.firstSlotStart && r.lastSlotEnd) {
					return `${r.firstSlotStart.slice(0, 5)} - ${r.lastSlotEnd.slice(0, 5)}`;
				}
				return "-";
			},
		},
		{
			field: "status",
			headerName: "Status",
			flex: 1,
			minWidth: 120,
			renderCell: (params: GridRenderCellParams) => (
				<Chip label={params.value} color={statusColorMap[params.value as AssignmentStatus]} size="small" />
			),
		},

		{
			field: "actions",
			headerName: "Actions",
			flex: 0.8,
			minWidth: 130,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => {
				const assignment = params.row as BusAssignmentSummary;
				const isCompletedOrCancelled =
					assignment.status === AssignmentStatus.Completed || assignment.status === AssignmentStatus.Cancelled;
				return (
					<Box>
						<Tooltip title="View Details">
							<IconButton onClick={() => handleOpenView(assignment)} size="small">
								<Eye fontSize={18} />
							</IconButton>
						</Tooltip>
						{!isCompletedOrCancelled && (
							<>
								<Tooltip title="Edit Assignment">
									<IconButton onClick={() => handleOpenEdit(assignment)} size="small" color="primary">
										<PencilSimple fontSize={18} />
									</IconButton>
								</Tooltip>
								<Tooltip title="Cancel Assignment">
									<IconButton onClick={() => handleCancelClick(assignment)} size="small" color="error">
										<TrashSimple fontSize={18} />
									</IconButton>
								</Tooltip>
							</>
						)}
					</Box>
				);
			},
		},
	];

	useEffect(() => {
		document.title = `Assignments | Dashboard | ${config.site.name}`;
	}, []);

	return (
		<Box sx={{ p: 3 }}>
			<Card>
				<CardHeader
					title="Bus Assignments"
					action={
						<Button variant="contained" startIcon={<Plus fontSize={18} />} onClick={handleOpenCreate}>
							Create Assignment
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
					{loading ? (
						<Box display="flex" justifyContent="center" py={4}>
							<CircularProgress />
						</Box>
					) : (
						<DataGrid
							rows={assignments}
							columns={columns}
							initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
							pageSizeOptions={[10, 25, 50]}
							disableRowSelectionOnClick
							autoHeight
							sx={{ minHeight: 400, width: "100%" }}
						/>
					)}
				</CardContent>
			</Card>

			{/* Create Assignment Dialog */}
			<Dialog open={createDialogOpen} onClose={() => !submitting && setCreateDialogOpen(false)} maxWidth="md" fullWidth>
				<form onSubmit={handleSubmit(onCreateSubmit)}>
					<DialogTitle>Create Bus Assignment</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="serviceDate"
								control={control}
								render={({ field }) => (
									<DatePicker
										label="Service Date"
										value={field.value ? dayjs(field.value) : null}
										onChange={(date) => field.onChange(date?.format("YYYY-MM-DD"))}
										minDate={dayjs()}
										slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.serviceDate } }}
									/>
								)}
							/>

							<Controller
								name="busId"
								control={control}
								render={({ field }) => (
									<FormControl fullWidth required error={!!errors.busId}>
										<InputLabel>Select Bus</InputLabel>
										<Select {...field} label="Select Bus" disabled={loadingDropdowns}>
											<MenuItem value={0}>Select a bus</MenuItem>
											{buses
												.filter((b) => b.isActive)
												.map((bus) => (
													<MenuItem key={bus.id} value={bus.id}>
														{bus.busNumber} (Capacity: {bus.capacity})
													</MenuItem>
												))}
										</Select>
									</FormControl>
								)}
							/>

							<Controller
								name="routeId"
								control={control}
								render={({ field }) => (
									<FormControl fullWidth required error={!!errors.routeId}>
										<InputLabel>Select Route</InputLabel>
										<Select {...field} label="Select Route" disabled={loadingDropdowns}>
											<MenuItem value={0}>Select a route</MenuItem>
											{routes
												.filter((r) => r.isActive)
												.map((route) => (
													<MenuItem key={route.id} value={route.id}>
														{route.name}
													</MenuItem>
												))}
										</Select>
									</FormControl>
								)}
							/>

							<Controller
								name="driverProfileId"
								control={control}
								render={({ field }) => (
									<FormControl fullWidth required error={!!errors.driverProfileId}>
										<InputLabel>Select Driver</InputLabel>
										<Select {...field} label="Select Driver" disabled={loadingDropdowns}>
											<MenuItem value={0}>Select a driver</MenuItem>
											{drivers
												.filter((d) => d.isActive)
												.map((driver) => (
													<MenuItem key={driver.id} value={driver.id}>
														{driver.licenseNumber} - {driver.phoneNumber}
													</MenuItem>
												))}
										</Select>
									</FormControl>
								)}
							/>

							<Typography variant="h6" sx={{ mt: 1 }}>
								Time Slots
							</Typography>

							{fields.length === 0 && (
								<Alert severity="info">No time slots added. Click "Add Time Slot" to create schedule.</Alert>
							)}

							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>#</TableCell>
											<TableCell>Start Time</TableCell>
											<TableCell>End Time</TableCell>
											<TableCell>Notes</TableCell>
											<TableCell align="center">Actions</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{fields.map((field, index) => (
											<TableRow key={field.id}>
												<TableCell>{index + 1}</TableCell>
												<TableCell>
													<Controller
														name={`timeSlots.${index}.startTime`}
														control={control}
														render={({ field }) => (
															<TextField {...field} type="time" size="small" sx={{ width: 100 }} />
														)}
													/>
												</TableCell>
												<TableCell>
													<Controller
														name={`timeSlots.${index}.endTime`}
														control={control}
														render={({ field }) => (
															<TextField {...field} type="time" size="small" sx={{ width: 100 }} />
														)}
													/>
												</TableCell>
												<TableCell>
													<Controller
														name={`timeSlots.${index}.notes`}
														control={control}
														render={({ field }) => (
															<TextField {...field} size="small" fullWidth placeholder="Optional" />
														)}
													/>
												</TableCell>
												<TableCell align="center">
													<IconButton color="error" size="small" onClick={() => remove(index)}>
														<X fontSize={16} />
													</IconButton>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>

							<Button
								variant="outlined"
								size="small"
								startIcon={<Plus fontSize={16} />}
								onClick={handleAddTimeSlot}
								sx={{ alignSelf: "flex-start" }}
							>
								Add Time Slot
							</Button>

							{errors.root && <Alert severity="error">{errors.root.message}</Alert>}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" variant="contained" disabled={submitting}>
							{submitting ? <CircularProgress size={24} /> : "Create Assignment"}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			{/* Edit Assignment Dialog */}
			<Dialog open={editDialogOpen} onClose={() => !editSubmitting && setEditDialogOpen(false)} maxWidth="md" fullWidth>
				<form onSubmit={handleEditSubmit(onEditSubmit)}>
					<DialogTitle>Edit Bus Assignment</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="serviceDate"
								control={editControl}
								render={({ field }) => (
									<DatePicker
										label="Service Date"
										value={field.value ? dayjs(field.value) : null}
										onChange={(date) => field.onChange(date?.format("YYYY-MM-DD"))}
										minDate={dayjs()}
										slotProps={{ textField: { fullWidth: true, required: true, error: !!editErrors.serviceDate } }}
									/>
								)}
							/>

							<Controller
								name="busId"
								control={editControl}
								render={({ field }) => (
									<FormControl fullWidth required error={!!editErrors.busId}>
										<InputLabel>Select Bus</InputLabel>
										<Select {...field} label="Select Bus" disabled={editSubmitting}>
											<MenuItem value={0}>Select a bus</MenuItem>
											{buses
												.filter((b) => b.isActive)
												.map((bus) => (
													<MenuItem key={bus.id} value={bus.id}>
														{bus.busNumber} (Capacity: {bus.capacity})
													</MenuItem>
												))}
										</Select>
									</FormControl>
								)}
							/>

							<Controller
								name="routeId"
								control={editControl}
								render={({ field }) => (
									<FormControl fullWidth required error={!!editErrors.routeId}>
										<InputLabel>Select Route</InputLabel>
										<Select {...field} label="Select Route" disabled={editSubmitting}>
											<MenuItem value={0}>Select a route</MenuItem>
											{routes
												.filter((r) => r.isActive)
												.map((route) => (
													<MenuItem key={route.id} value={route.id}>
														{route.name}
													</MenuItem>
												))}
										</Select>
									</FormControl>
								)}
							/>

							<Controller
								name="driverProfileId"
								control={editControl}
								render={({ field }) => (
									<FormControl fullWidth required error={!!editErrors.driverProfileId}>
										<InputLabel>Select Driver</InputLabel>
										<Select {...field} label="Select Driver" disabled={editSubmitting}>
											<MenuItem value={0}>Select a driver</MenuItem>
											{drivers
												.filter((d) => d.isActive)
												.map((driver) => (
													<MenuItem key={driver.id} value={driver.id}>
														{driver.licenseNumber} - {driver.phoneNumber}
													</MenuItem>
												))}
										</Select>
									</FormControl>
								)}
							/>

							<Controller
								name="status"
								control={editControl}
								render={({ field }) => (
									<FormControl fullWidth required error={!!editErrors.status}>
										<InputLabel>Status</InputLabel>
										<Select {...field} label="Status">
											{Object.values(AssignmentStatus).map((status) => (
												<MenuItem
													key={status}
													value={status}
													disabled={status === AssignmentStatus.Completed || status === AssignmentStatus.Cancelled}
												>
													{status}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								)}
							/>

							<Divider />

							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Typography variant="h6">Time Slots</Typography>
								<Button
									variant="outlined"
									size="small"
									startIcon={<Plus fontSize={16} />}
									onClick={handleOpenAddTimeSlot}
								>
									Add Time Slot
								</Button>
							</Stack>

							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>#</TableCell>
											<TableCell>Start Time</TableCell>
											<TableCell>End Time</TableCell>
											<TableCell>Status</TableCell>
											<TableCell>Actual Start</TableCell>
											<TableCell>Actual End</TableCell>
											<TableCell>Notes</TableCell>
											<TableCell align="center">Actions</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{editTimeSlots.length === 0 ? (
											<TableRow>
												<TableCell colSpan={8} align="center">
													No time slots added
												</TableCell>
											</TableRow>
										) : (
											editTimeSlots
												.sort((a, b) => a.slotNumber - b.slotNumber)
												.map((slot) => (
													<TableRow key={slot.id}>
														<TableCell>{slot.slotNumber}</TableCell>
														<TableCell>{slot.startTime.slice(0, 5)}</TableCell>
														<TableCell>{slot.endTime.slice(0, 5)}</TableCell>
														<TableCell>
															<Chip
																label={slot.status}
																size="small"
																color={
																	slot.status === TimeSlotStatus.Completed
																		? "success"
																		: slot.status === TimeSlotStatus.InProgress
																			? "warning"
																			: slot.status === TimeSlotStatus.Cancelled
																				? "error"
																				: "default"
																}
															/>
														</TableCell>
														<TableCell>{slot.actualStartTime?.slice(0, 5) || "-"}</TableCell>
														<TableCell>{slot.actualEndTime?.slice(0, 5) || "-"}</TableCell>
														<TableCell>{slot.notes || "-"}</TableCell>
														<TableCell align="center">
															<Tooltip title="Edit Slot">
																<IconButton size="small" onClick={() => handleOpenEditTimeSlot(slot)}>
																	<PencilSimple fontSize={16} />
																</IconButton>
															</Tooltip>
															<Tooltip title="Delete Slot">
																<IconButton size="small" color="error" onClick={() => handleDeleteTimeSlotClick(slot)}>
																	<TrashSimple fontSize={16} />
																</IconButton>
															</Tooltip>
														</TableCell>
													</TableRow>
												))
										)}
									</TableBody>
								</Table>
							</TableContainer>

							{editErrors.root && <Alert severity="error">{editErrors.root.message}</Alert>}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setEditDialogOpen(false)} disabled={editSubmitting}>
							Cancel
						</Button>
						<Button type="submit" variant="contained" disabled={editSubmitting}>
							{editSubmitting ? <CircularProgress size={24} /> : "Save Changes"}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			{/* Add/Edit Time Slot Dialog */}
			<Dialog
				open={timeSlotDialogOpen}
				onClose={() => !editSubmitting && setTimeSlotDialogOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<form onSubmit={handleTimeSlotSubmit(onTimeSlotSubmit)}>
					<DialogTitle>{editingTimeSlot ? "Edit Time Slot" : "Add Time Slot"}</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="slotNumber"
								control={timeSlotControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Slot Number"
										type="number"
										fullWidth
										required
										error={!!timeSlotErrors.slotNumber}
										helperText={timeSlotErrors.slotNumber?.message}
										disabled={!!editingTimeSlot} // Can't change slot number for existing slots
									/>
								)}
							/>
							<Controller
								name="startTime"
								control={timeSlotControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Start Time"
										type="time"
										fullWidth
										required
										InputLabelProps={{ shrink: true }}
										error={!!timeSlotErrors.startTime}
										helperText={timeSlotErrors.startTime?.message}
									/>
								)}
							/>
							<Controller
								name="endTime"
								control={timeSlotControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="End Time"
										type="time"
										fullWidth
										required
										InputLabelProps={{ shrink: true }}
										error={!!timeSlotErrors.endTime}
										helperText={timeSlotErrors.endTime?.message}
									/>
								)}
							/>
							<Controller
								name="status"
								control={timeSlotControl}
								render={({ field }) => (
									<FormControl fullWidth required>
										<InputLabel>Status</InputLabel>
										<Select {...field} label="Status">
											{Object.values(TimeSlotStatus).map((status) => (
												<MenuItem key={status} value={status}>
													{status}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								)}
							/>
							<Controller
								name="actualStartTime"
								control={timeSlotControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Actual Start Time (Optional)"
										type="time"
										fullWidth
										InputLabelProps={{ shrink: true }}
									/>
								)}
							/>
							<Controller
								name="actualEndTime"
								control={timeSlotControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Actual End Time (Optional)"
										type="time"
										fullWidth
										InputLabelProps={{ shrink: true }}
									/>
								)}
							/>
							<Controller
								name="notes"
								control={timeSlotControl}
								render={({ field }) => <TextField {...field} label="Notes" fullWidth multiline rows={2} />}
							/>
							{timeSlotErrors.root && <Alert severity="error">{timeSlotErrors.root.message}</Alert>}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setTimeSlotDialogOpen(false)} disabled={editSubmitting}>
							Cancel
						</Button>
						<Button type="submit" variant="contained" disabled={editSubmitting}>
							{editSubmitting ? <CircularProgress size={24} /> : editingTimeSlot ? "Update Slot" : "Add Slot"}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			{/* View Assignment Dialog */}
			<Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>Assignment Details</DialogTitle>
				<DialogContent>
					{selectedAssignment && (
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Paper variant="outlined" sx={{ p: 2 }}>
								<Typography variant="subtitle2" color="text.secondary" gutterBottom>
									Assignment Info
								</Typography>
								<Stack direction="row" spacing={4} flexWrap="wrap">
									<Typography>
										<strong>ID:</strong> {selectedAssignment.id}
									</Typography>
									<Typography>
										<strong>Bus:</strong> {selectedAssignment.busNumber}
									</Typography>
									<Typography>
										<strong>Route:</strong> {selectedAssignment.routeName}
									</Typography>
									<Typography>
										<strong>Driver:</strong> {selectedAssignment.driverName}
									</Typography>
									<Typography>
										<strong>Date:</strong> {dayjs(selectedAssignment.serviceDate).format("MMMM DD, YYYY")}
									</Typography>
									<Typography>
										<strong>Status:</strong>{" "}
										<Chip
											label={selectedAssignment.status}
											color={statusColorMap[selectedAssignment.status]}
											size="small"
										/>
									</Typography>
								</Stack>
							</Paper>

							<Typography variant="subtitle2" color="text.secondary">
								Time Slots
							</Typography>
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Slot #</TableCell>
											<TableCell>Start Time</TableCell>
											<TableCell>End Time</TableCell>
											<TableCell>Status</TableCell>
											<TableCell>Notes</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{selectedAssignment.timeSlots.length === 0 ? (
											<TableRow>
												<TableCell colSpan={5} align="center">
													No time slots available
												</TableCell>
											</TableRow>
										) : (
											selectedAssignment.timeSlots.map((slot) => (
												<TableRow key={slot.id}>
													<TableCell>{slot.slotNumber}</TableCell>
													<TableCell>{slot.startTime.slice(0, 5)}</TableCell>
													<TableCell>{slot.endTime.slice(0, 5)}</TableCell>
													<TableCell>
														<Chip
															label={slot.status}
															size="small"
															color={
																slot.status === TimeSlotStatus.Completed
																	? "success"
																	: slot.status === TimeSlotStatus.InProgress
																		? "warning"
																		: slot.status === TimeSlotStatus.Cancelled
																			? "error"
																			: "default"
															}
														/>
													</TableCell>
													<TableCell>{slot.notes || "-"}</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</TableContainer>
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setViewDialogOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>

			{/* Cancel Confirmation Dialog */}
			<Dialog open={cancelDialogOpen} onClose={() => !submitting && setCancelDialogOpen(false)}>
				<DialogTitle>Confirm Cancellation</DialogTitle>
				<DialogContent>
					<Typography>
						Are you sure you want to cancel assignment for bus <strong>{cancellingAssignment?.busNumber}</strong> on{" "}
						{cancellingAssignment?.serviceDate && dayjs(cancellingAssignment.serviceDate).format("MMM DD, YYYY")}?
					</Typography>
					<Alert severity="warning" sx={{ mt: 2 }}>
						This will cancel all scheduled time slots for this assignment.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCancelDialogOpen(false)} disabled={submitting}>
						No, Keep It
					</Button>
					<Button onClick={handleCancelConfirm} color="error" variant="contained" disabled={submitting}>
						{submitting ? <CircularProgress size={24} /> : "Yes, Cancel Assignment"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Delete Time Slot Confirmation Dialog */}
			<Dialog open={deleteTimeSlotDialogOpen} onClose={() => !editSubmitting && setDeleteTimeSlotDialogOpen(false)}>
				<DialogTitle>Confirm Delete Time Slot</DialogTitle>
				<DialogContent>
					<Typography>Are you sure you want to delete time slot #{editingTimeSlot?.slotNumber}?</Typography>
					<Alert severity="warning" sx={{ mt: 2 }}>
						This action cannot be undone.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteTimeSlotDialogOpen(false)} disabled={editSubmitting}>
						Cancel
					</Button>
					<Button onClick={handleDeleteTimeSlotConfirm} color="error" variant="contained" disabled={editSubmitting}>
						{editSubmitting ? <CircularProgress size={24} /> : "Delete Slot"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
