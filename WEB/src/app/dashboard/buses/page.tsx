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
	DialogContentText,
	DialogTitle,
	Divider,
	FormControlLabel,
	IconButton,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { PencilSimple, Plus, TrashSimple } from "@phosphor-icons/react";
import { Controller, useForm } from "react-hook-form";
import { z as zod } from "zod";

import { config } from "@/config";
import { Bus, busesApi, CreateBusRequest, UpdateBusRequest } from "@/lib/api/buses";
import { DataGrid, GridColDef, GridRenderCellParams } from "@/components/core/data-grid";

const busSchema = zod.object({
	busNumber: zod.string().min(1, "Bus number is required").max(20, "Maximum 20 characters"),
	capacity: zod.number().min(1, "Capacity must be at least 1").max(100, "Capacity cannot exceed 100"),
	isActive: zod.boolean().default(true),
});

type BusFormData = zod.infer<typeof busSchema>;

export default function BusesPage() {
	const [buses, setBuses] = useState<Bus[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editingBus, setEditingBus] = useState<Bus | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const {
		control,
		handleSubmit,
		reset,
		setError: setFormError,
		formState: { errors },
	} = useForm<BusFormData>({
		resolver: zodResolver(busSchema),
		defaultValues: { busNumber: "", capacity: 50, isActive: true },
	});

	const fetchBuses = useCallback(async () => {
		try {
			setLoading(true);
			const data = await busesApi.getAll();
			setBuses(data);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to load buses");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchBuses();
	}, [fetchBuses]);

	const handleOpenCreate = () => {
		setEditingBus(null);
		reset({ busNumber: "", capacity: 50, isActive: true });
		setDialogOpen(true);
	};

	const handleOpenEdit = (bus: Bus) => {
		setEditingBus(bus);
		reset({ busNumber: bus.busNumber, capacity: bus.capacity, isActive: bus.isActive });
		setDialogOpen(true);
	};

	const handleDeleteClick = (bus: Bus) => {
		setEditingBus(bus);
		setDeleteDialogOpen(true);
	};

	const onSubmit: any = async (data: BusFormData) => {
		setSubmitting(true);
		try {
			if (editingBus) {
				await busesApi.update(editingBus.id, data as UpdateBusRequest);
			} else {
				await busesApi.create(data as CreateBusRequest);
			}
			setDialogOpen(false);
			fetchBuses();
		} catch (err: any) {
			if (err.message?.includes("already exists")) {
				setFormError("busNumber", { message: "Bus number already exists" });
			} else {
				setFormError("root", { message: err.message || "Failed to save bus" });
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!editingBus) return;
		setSubmitting(true);
		try {
			await busesApi.delete(editingBus.id);
			setDeleteDialogOpen(false);
			fetchBuses();
		} catch (err: any) {
			setError(err.message || "Failed to delete bus");
			setDeleteDialogOpen(false);
		} finally {
			setSubmitting(false);
		}
	};

	const columns: GridColDef[] = [
		{ field: "id", headerName: "ID", flex: 0.5, minWidth: 80, sortable: true },
		{ field: "busNumber", headerName: "Bus Number", flex: 2, minWidth: 150, sortable: true },
		{ field: "capacity", headerName: "Capacity", flex: 1, minWidth: 100, sortable: true },
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
			flex: 0.8,
			minWidth: 80,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Box>
					<Tooltip title="Edit">
						<IconButton onClick={() => handleOpenEdit(params.row as Bus)} size="small">
							<PencilSimple fontSize={18} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Delete">
						<IconButton onClick={() => handleDeleteClick(params.row as Bus)} size="small" color="error">
							<TrashSimple fontSize={18} />
						</IconButton>
					</Tooltip>
				</Box>
			),
		},
	];

	useEffect(() => {
		document.title = `Buses | Dashboard | ${config.site.name}`;
	}, []);
	return (
		<Box sx={{ p: 3 }}>
			<Card>
				<CardHeader
					title="Buses"
					action={
						<Button variant="contained" startIcon={<Plus fontSize={18} />} onClick={handleOpenCreate}>
							Add Bus
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
							rows={buses}
							columns={columns}
							initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
							pageSizeOptions={[10, 25, 50]}
							disableRowSelectionOnClick
							autoHeight
							sx={{
								minHeight: 400,
								width: "100%",
								"& .MuiDataGrid-main": { width: "100%" },
								"& .MuiDataGrid-virtualScroller": { width: "100%" },
							}}
						/>
					)}
				</CardContent>
			</Card>

			{/* Create/Edit Dialog */}
			<Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} maxWidth="sm" fullWidth>
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogTitle>{editingBus ? "Edit Bus" : "Add New Bus"}</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="busNumber"
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label="Bus Number"
										fullWidth
										error={!!errors.busNumber}
										helperText={errors.busNumber?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="capacity"
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label="Capacity"
										type="number"
										fullWidth
										error={!!errors.capacity}
										helperText={errors.capacity?.message}
										disabled={submitting}
										onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
							{errors.root && <Alert severity="error">{errors.root.message}</Alert>}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDialogOpen(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" variant="contained" disabled={submitting}>
							{submitting ? <CircularProgress size={24} /> : editingBus ? "Update" : "Create"}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onClose={() => !submitting && setDeleteDialogOpen(false)}>
				<DialogTitle>Confirm Delete</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Are you sure you want to deactivate bus <strong>{editingBus?.busNumber}</strong>? This will soft-delete the
						bus and it won't appear in active lists.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
						Cancel
					</Button>
					<Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={submitting}>
						{submitting ? <CircularProgress size={24} /> : "Deactivate"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
