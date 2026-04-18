"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	closestCenter,
	DndContext,
	DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
	FormControlLabel,
	IconButton,
	Paper,
	Stack,
	Switch,
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
import { ArrowDown, PencilSimple, Plus, TrashSimple, X } from "@phosphor-icons/react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z as zod } from "zod";

import { config } from "@/config";
import {
	AddRouteStopRequest,
	CreateRouteRequest,
	Route,
	routesApi,
	RouteStop,
	UpdateRouteRequest,
	UpdateRouteStopRequest,
} from "@/lib/api/routes";

const stopSchema = zod.object({
	name: zod.string().min(1, "Stop name required").max(100),
	latitude: zod.number().min(-90).max(90),
	longitude: zod.number().min(-180).max(180),
	stopOrder: zod.number().min(1),
});

const createRouteSchema = zod.object({
	name: zod.string().min(1, "Route name required").max(100),
	isActive: zod.boolean().default(true),
	stops: zod.array(stopSchema).min(1, "At least one stop required"),
});
const updateRouteSchema = zod.object({
	name: zod.string().min(1, "Route name required").max(100),
	isActive: zod.boolean().default(true),
	stops: zod.array(stopSchema).optional(),
});

type RouteFormData = zod.infer<typeof createRouteSchema>;
type StopFormData = zod.infer<typeof stopSchema>;

// Sortable stop row component for drag-and-drop
function SortableStopRow({
	stop,
	index,
	onEdit,
	onDelete,
}: {
	stop: RouteStop;
	index: number;
	onEdit: (stop: RouteStop) => void;
	onDelete: (stop: RouteStop) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		backgroundColor: isDragging ? "action.hover" : "inherit",
	};

	return (
		<TableRow ref={setNodeRef} style={style} {...attributes}>
			<TableCell sx={{ width: 60 }}>
				<IconButton size="small" {...listeners} sx={{ cursor: "grab" }}>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
						<path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6-12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
					</svg>
				</IconButton>
			</TableCell>
			<TableCell>{index + 1}</TableCell>
			<TableCell>{stop.name}</TableCell>
			<TableCell>{stop.latitude}</TableCell>
			<TableCell>{stop.longitude}</TableCell>
			<TableCell align="center">
				<Tooltip title="Edit">
					<IconButton size="small" onClick={() => onEdit(stop)}>
						<PencilSimple fontSize={16} />
					</IconButton>
				</Tooltip>
				<Tooltip title="Delete">
					<IconButton size="small" color="error" onClick={() => onDelete(stop)}>
						<TrashSimple fontSize={16} />
					</IconButton>
				</Tooltip>
			</TableCell>
		</TableRow>
	);
}

export default function RoutesPage() {
	const [routes, setRoutes] = useState<Route[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editingRoute, setEditingRoute] = useState<Route | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
	const [stopDialogOpen, setStopDialogOpen] = useState(false);
	const [editingStop, setEditingStop] = useState<RouteStop | null>(null);
	const [deleteStopDialogOpen, setDeleteStopDialogOpen] = useState(false);

	const [localStops, setLocalStops] = useState<RouteStop[]>([]);
	const [isReordering, setIsReordering] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || active.id === over.id) {
			return;
		}

		setLocalStops((items) => {
			const oldIndex = items.findIndex((item) => item.id === active.id);
			const newIndex = items.findIndex((item) => item.id === over.id);
			return arrayMove(items, oldIndex, newIndex);
		});
	};

	const handleSaveStopOrder = async () => {
		if (!selectedRoute) return;

		setIsReordering(true);

		try {
			// Step 1: move all stops to temporary high order values
			for (let i = 0; i < localStops.length; i++) {
				const stop = localStops[i];

				await routesApi.updateStop(selectedRoute.id, stop.id, {
					name: stop.name,
					latitude: stop.latitude,
					longitude: stop.longitude,
					stopOrder: 1000 + i,
				});
			}

			// Step 2: assign the real final order
			for (let i = 0; i < localStops.length; i++) {
				const stop = localStops[i];

				await routesApi.updateStop(selectedRoute.id, stop.id, {
					name: stop.name,
					latitude: stop.latitude,
					longitude: stop.longitude,
					stopOrder: i + 1,
				});
			}

			const updatedRoute = await routesApi.getById(selectedRoute.id);
			setSelectedRoute(updatedRoute);

			const sortedStops = updatedRoute.stops ? [...updatedRoute.stops].sort((a, b) => a.stopOrder - b.stopOrder) : [];

			setLocalStops(sortedStops);
			fetchRoutes();
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to reorder stops");

			if (selectedRoute?.stops) {
				setLocalStops([...selectedRoute.stops].sort((a, b) => a.stopOrder - b.stopOrder));
			}
		} finally {
			setIsReordering(false);
		}
	};
	const {
		control,
		handleSubmit,
		reset,
		setValue,
		getValues,
		setError: setFormError,
		formState: { errors },
	} = useForm<RouteFormData>({
		resolver: zodResolver(editingRoute ? updateRouteSchema : createRouteSchema),
		defaultValues: { name: "", isActive: true, stops: [] },
	});

	const { fields, append, remove, move } = useFieldArray({
		control,
		name: "stops",
	});

	const fetchRoutes = useCallback(async () => {
		try {
			setLoading(true);
			const data = await routesApi.getAll();
			setRoutes(data);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to load routes");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchRoutes();
	}, [fetchRoutes]);

	const handleOpenCreate = () => {
		setEditingRoute(null);
		reset({ name: "", isActive: true, stops: [] });
		setDialogOpen(true);
	};

	const handleOpenEdit = async (route: Route) => {
		setEditingRoute(route);
		const fullRoute = await routesApi.getById(route.id);
		reset({
			name: fullRoute.name,
			isActive: fullRoute.isActive,
			stops: [],
		});
		setDialogOpen(true);
	};

	const handleDeleteClick = (route: Route) => {
		setEditingRoute(route);
		setDeleteDialogOpen(true);
	};

	const onSubmit: any = async (data: RouteFormData) => {
		setSubmitting(true);
		try {
			const stopsWithOrder = data.stops.map((stop, idx) => ({
				...stop,
				stopOrder: idx + 1,
			}));

			if (editingRoute) {
				await routesApi.update(editingRoute.id, {
					name: data.name,
					isActive: data.isActive,
				});
				// Note: Stops update would require separate endpoints or full replacement
			} else {
				await routesApi.create({
					name: data.name,
					stops: stopsWithOrder,
				});
			}
			setDialogOpen(false);
			fetchRoutes();
		} catch (err: any) {
			if (err.message?.includes("already exists")) {
				setFormError("name", { message: "Route name already exists" });
			} else {
				setFormError("root", { message: err.message || "Failed to save route" });
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!editingRoute) return;
		setSubmitting(true);
		try {
			await routesApi.delete(editingRoute.id);
			setDeleteDialogOpen(false);
			fetchRoutes();
		} catch (err: any) {
			if (err.message?.includes("active assignments")) {
				setError("You cannot delete stops from a route that currently has active assignments.");
			} else {
				setError(err.message || "Failed to delete stop");
			}
			setDeleteDialogOpen(false);
		} finally {
			setSubmitting(false);
		}
	};

	const handleViewStops = (route: Route) => {
		setSelectedRoute(route);
		// Initialize localStops with sorted stops
		const sortedStops = route.stops ? [...route.stops].sort((a, b) => a.stopOrder - b.stopOrder) : [];
		setLocalStops(sortedStops);
	};

	const handleAddStop = () => {
		setEditingStop(null);
		setStopDialogOpen(true);
	};

	const handleEditStop = (stop: RouteStop) => {
		setEditingStop(stop);
		setStopDialogOpen(true);
	};

	const handleDeleteStopClick = (stop: RouteStop) => {
		setEditingStop(stop);
		setDeleteStopDialogOpen(true);
	};

	const handleSaveStop = async (data: StopFormData) => {
		if (!selectedRoute) return;
		setSubmitting(true);
		try {
			if (editingStop) {
				await routesApi.updateStop(selectedRoute.id, editingStop.id, data);
			} else {
				await routesApi.addStop(selectedRoute.id, data);
			}
			setStopDialogOpen(false);
			const updatedRoute = await routesApi.getById(selectedRoute.id);
			setSelectedRoute(updatedRoute);
			// Update localStops as well
			const sortedStops = updatedRoute.stops ? [...updatedRoute.stops].sort((a, b) => a.stopOrder - b.stopOrder) : [];
			setLocalStops(sortedStops);
			fetchRoutes();
		} catch (err: any) {
			setError(err.message || "Failed to save stop");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteStopConfirm = async () => {
		if (!selectedRoute || !editingStop) return;
		setSubmitting(true);
		try {
			await routesApi.deleteStop(selectedRoute.id, editingStop.id);
			setDeleteStopDialogOpen(false);
			const updatedRoute = await routesApi.getById(selectedRoute.id);
			setSelectedRoute(updatedRoute);
			// Update localStops after deletion
			const sortedStops = updatedRoute.stops ? [...updatedRoute.stops].sort((a, b) => a.stopOrder - b.stopOrder) : [];
			setLocalStops(sortedStops);
			fetchRoutes();
		} catch (err: any) {
			setError(err.message || "Failed to delete stop");
			setDeleteStopDialogOpen(false);
		} finally {
			setSubmitting(false);
		}
	};

	const columns: GridColDef[] = [
		{ field: "id", headerName: "ID", flex: 0.5, minWidth: 80, sortable: true },
		{ field: "name", headerName: "Route Name", flex: 2, minWidth: 200, sortable: true },
		{
			field: "stopsCount",
			headerName: "Stops",
			flex: 1,
			minWidth: 100,
			valueGetter: (value, row, column, apiRef) => {
				// 'row' is the second parameter, not inside params
				return row.stops?.length || 0;
			},
		},
		{
			field: "isActive",
			headerName: "Status",
			flex: 1,
			minWidth: 100,
			renderCell: (params: GridRenderCellParams) => (
				<Chip label={params.value ? "Active" : "Inactive"} color={params.value ? "success" : "error"} size="small" />
			),
		},
		{
			field: "actions",
			headerName: "Actions",
			flex: 1.2,
			minWidth: 120,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Box>
					<Tooltip title="View Stops">
						<IconButton onClick={() => handleViewStops(params.row as Route)} size="small">
							<ArrowDown fontSize={18} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Edit">
						<IconButton onClick={() => handleOpenEdit(params.row as Route)} size="small">
							<PencilSimple fontSize={18} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Delete">
						<IconButton onClick={() => handleDeleteClick(params.row as Route)} size="small" color="error">
							<TrashSimple fontSize={18} />
						</IconButton>
					</Tooltip>
				</Box>
			),
		},
	];

	useEffect(() => {
		document.title = `Routes | Dashboard | ${config.site.name}`;
	}, []);

	return (
		<Box sx={{ p: 3 }}>
			<Card>
				<CardHeader
					title="Routes"
					action={
						<Button variant="contained" startIcon={<Plus fontSize={18} />} onClick={handleOpenCreate}>
							Add Route
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
							rows={routes}
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

			{/* Create/Edit Route Dialog */}
			<Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} maxWidth="md" fullWidth>
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogTitle>{editingRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="name"
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label="Route Name"
										fullWidth
										error={!!errors.name}
										helperText={errors.name?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="isActive"
								control={control}
								render={({ field }) => (
									<FormControlLabel
										control={<Switch checked={field.value} onChange={field.onChange} />}
										label="Active"
									/>
								)}
							/>

							<Box>
								<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
									<Typography variant="h6">Stops</Typography>
									<Button
										variant="outlined"
										size="small"
										startIcon={<Plus fontSize={16} />}
										onClick={() =>
											append({
												name: "",
												latitude: 0,
												longitude: 0,
												stopOrder: fields.length + 1,
											})
										}
									>
										Add Stop
									</Button>
								</Stack>

								<Stack spacing={2}>
									{fields.map((field, index) => (
										<Card key={field.id} variant="outlined">
											<CardContent>
												<Stack spacing={2}>
													<Stack direction="row" justifyContent="space-between" alignItems="center">
														<Typography variant="subtitle1">Stop #{index + 1}</Typography>

														<IconButton color="error" onClick={() => remove(index)}>
															<TrashSimple fontSize={18} />
														</IconButton>
													</Stack>

													<Controller
														name={`stops.${index}.name`}
														control={control}
														render={({ field }) => (
															<TextField
																{...field}
																label="Stop Name"
																fullWidth
																error={!!errors.stops?.[index]?.name}
																helperText={errors.stops?.[index]?.name?.message}
															/>
														)}
													/>

													<Controller
														name={`stops.${index}.latitude`}
														control={control}
														render={({ field }) => (
															<TextField
																{...field}
																label="Latitude"
																type="number"
																fullWidth
																error={!!errors.stops?.[index]?.latitude}
																helperText={errors.stops?.[index]?.latitude?.message}
																onChange={(e) => field.onChange(parseFloat(e.target.value))}
															/>
														)}
													/>

													<Controller
														name={`stops.${index}.longitude`}
														control={control}
														render={({ field }) => (
															<TextField
																{...field}
																label="Longitude"
																type="number"
																fullWidth
																error={!!errors.stops?.[index]?.longitude}
																helperText={errors.stops?.[index]?.longitude?.message}
																onChange={(e) => field.onChange(parseFloat(e.target.value))}
															/>
														)}
													/>
												</Stack>
											</CardContent>
										</Card>
									))}
								</Stack>
							</Box>

							{errors.stops && typeof errors.stops.message === "string" && (
								<Alert severity="error">{errors.stops.message}</Alert>
							)}
							{errors.root && <Alert severity="error">{errors.root.message}</Alert>}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDialogOpen(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" variant="contained" disabled={submitting}>
							{submitting ? <CircularProgress size={24} /> : editingRoute ? "Update" : "Create"}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			{/* Delete Route Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onClose={() => !submitting && setDeleteDialogOpen(false)}>
				<DialogTitle>Confirm Delete</DialogTitle>
				<DialogContent>
					<Typography>
						Are you sure you want to delete route <strong>{editingRoute?.name}</strong>?
						{editingRoute?.stops?.length && editingRoute.stops.length > 0 && (
							<Alert severity="warning" sx={{ mt: 2 }}>
								This route has {editingRoute.stops.length} stop(s). They will also be deleted.
							</Alert>
						)}
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
						Cancel
					</Button>
					<Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={submitting}>
						{submitting ? <CircularProgress size={24} /> : "Delete"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* View Stops Dialog with Drag-and-Drop */}
			<Dialog
				open={!!selectedRoute}
				onClose={() => {
					setSelectedRoute(null);
					setLocalStops([]);
				}}
				maxWidth="md"
				fullWidth
			>
				<DialogTitle>
					Stops for Route: {selectedRoute?.name}
					<Stack direction="row" spacing={1} sx={{ mt: 1 }}>
						<Button variant="contained" size="small" startIcon={<Plus fontSize={16} />} onClick={handleAddStop}>
							Add Stop
						</Button>
						{localStops.length > 0 && (
							<Button variant="outlined" size="small" onClick={handleSaveStopOrder} disabled={isReordering}>
								{isReordering ? <CircularProgress size={20} /> : "Save Order"}
							</Button>
						)}
					</Stack>
				</DialogTitle>
				<DialogContent>
					{selectedRoute && (
						<Box sx={{ mt: 2 }}>
							<Alert severity="info" sx={{ mb: 2 }}>
								💡 Drag the ⋮⋮ icon to reorder stops. Click "Save Order" to apply changes.
							</Alert>

							{!selectedRoute.stops || selectedRoute.stops.length === 0 ? (
								<Alert severity="info">No stops added to this route yet.</Alert>
							) : (
								<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
									<SortableContext items={localStops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
										<TableContainer component={Paper} variant="outlined">
											<Table>
												<TableHead>
													<TableRow>
														<TableCell sx={{ width: 60 }}>Drag</TableCell>
														<TableCell sx={{ width: 80 }}>Order</TableCell>
														<TableCell>Stop Name</TableCell>
														<TableCell>Latitude</TableCell>
														<TableCell>Longitude</TableCell>
														<TableCell align="center" sx={{ width: 100 }}>
															Actions
														</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{localStops.map((stop, index) => (
														<SortableStopRow
															key={stop.id}
															stop={stop}
															index={index}
															onEdit={handleEditStop}
															onDelete={handleDeleteStopClick}
														/>
													))}
												</TableBody>
											</Table>
										</TableContainer>
									</SortableContext>
								</DndContext>
							)}
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setSelectedRoute(null);
							setLocalStops([]);
						}}
					>
						Close
					</Button>
				</DialogActions>
			</Dialog>

			{/* Add/Edit Stop Dialog */}
			<StopFormDialog
				open={stopDialogOpen}
				onClose={() => setStopDialogOpen(false)}
				onSave={handleSaveStop}
				editingStop={editingStop}
				nextOrder={(selectedRoute?.stops?.length || 0) + 1}
				submitting={submitting}
			/>

			{/* Delete Stop Confirmation Dialog */}
			<Dialog open={deleteStopDialogOpen} onClose={() => !submitting && setDeleteStopDialogOpen(false)}>
				<DialogTitle>Confirm Delete Stop</DialogTitle>
				<DialogContent>
					<Typography>
						Are you sure you want to delete stop <strong>{editingStop?.name}</strong>?
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteStopDialogOpen(false)} disabled={submitting}>
						Cancel
					</Button>
					<Button onClick={handleDeleteStopConfirm} color="error" variant="contained" disabled={submitting}>
						{submitting ? <CircularProgress size={24} /> : "Delete"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

// Stop Form Dialog Component
function StopFormDialog({
	open,
	onClose,
	onSave,
	editingStop,
	nextOrder,
	submitting,
}: {
	open: boolean;
	onClose: () => void;
	onSave: (data: StopFormData) => Promise<void>;
	editingStop: RouteStop | null;
	nextOrder: number;
	submitting: boolean;
}) {
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<StopFormData>({
		resolver: zodResolver(stopSchema),
		defaultValues: { name: "", latitude: 0, longitude: 0, stopOrder: nextOrder },
	});

	useEffect(() => {
		if (editingStop) {
			reset({
				name: editingStop.name,
				latitude: editingStop.latitude,
				longitude: editingStop.longitude,
				stopOrder: editingStop.stopOrder,
			});
		} else {
			reset({ name: "", latitude: 0, longitude: 0, stopOrder: nextOrder });
		}
	}, [editingStop, nextOrder, reset]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<form onSubmit={handleSubmit(onSave)}>
				<DialogTitle>{editingStop ? "Edit Stop" : "Add Stop"}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Controller
							name="name"
							control={control}
							render={({ field }) => (
								<TextField
									{...field}
									label="Stop Name"
									fullWidth
									error={!!errors.name}
									helperText={errors.name?.message}
									disabled={submitting}
								/>
							)}
						/>
						<Controller
							name="latitude"
							control={control}
							render={({ field }) => (
								<TextField
									{...field}
									label="Latitude"
									type="number"
									fullWidth
									error={!!errors.latitude}
									helperText={errors.latitude?.message}
									disabled={submitting}
									onChange={(e) => field.onChange(parseFloat(e.target.value))}
								/>
							)}
						/>
						<Controller
							name="longitude"
							control={control}
							render={({ field }) => (
								<TextField
									{...field}
									label="Longitude"
									type="number"
									fullWidth
									error={!!errors.longitude}
									helperText={errors.longitude?.message}
									disabled={submitting}
									onChange={(e) => field.onChange(parseFloat(e.target.value))}
								/>
							)}
						/>
						<Controller
							name="stopOrder"
							control={control}
							render={({ field }) => (
								<TextField
									{...field}
									label="Stop Order"
									type="number"
									fullWidth
									error={!!errors.stopOrder}
									helperText={errors.stopOrder?.message}
									disabled={submitting}
									onChange={(e) => field.onChange(parseInt(e.target.value))}
								/>
							)}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose} disabled={submitting}>
						Cancel
					</Button>
					<Button type="submit" variant="contained" disabled={submitting}>
						{submitting ? <CircularProgress size={24} /> : editingStop ? "Update" : "Add"}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
}
