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
	FormControlLabel,
	IconButton,
	Paper,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Eye, PencilSimple, Plus, TrashSimple } from "@phosphor-icons/react";
import { Controller, useForm } from "react-hook-form";
import { z as zod } from "zod";

import { config } from "@/config";
import { CreateDriverRequest, DriverDetail, DriverProfile, driversApi, UpdateDriverRequest } from "@/lib/api/drivers";

const createDriverSchema = zod.object({
	email: zod.string().min(1, "Email is required").email("Invalid email format"),
	phoneNumber: zod.string().min(1, "Phone number is required"),
	licenseNumber: zod.string().min(1, "License number is required"),
	fullName: zod
		.string()
		.regex(/^[a-zA-Z]*$/, "Full name can only contain letters without spaces")
		.optional(),
	address: zod.string().optional(),
	nationalId: zod.string().optional(),
	emergencyContact: zod.string().optional(),
	password: zod.preprocess(
		(val) => (val === "" ? undefined : val),
		zod.string().min(6, "Password must be at least 6 characters").optional()
	),
});

const updateDriverSchema = zod.object({
	licenseNumber: zod.string().min(1, "License number is required").optional(),
	phoneNumber: zod.string().min(1, "Phone number is required").optional(),
	address: zod.string().optional(),
	nationalId: zod.string().optional(),
	emergencyContact: zod.string().optional(),
	isActive: zod.boolean().optional(),
});

type CreateDriverFormData = zod.infer<typeof createDriverSchema>;
type UpdateDriverFormData = zod.infer<typeof updateDriverSchema>;

export default function DriversPage() {
	const [drivers, setDrivers] = useState<DriverProfile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [viewDialogOpen, setViewDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedDriver, setSelectedDriver] = useState<DriverDetail | null>(null);
	const [editingDriver, setEditingDriver] = useState<DriverProfile | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

	const {
		control: createControl,
		handleSubmit: handleCreateSubmit,
		reset: resetCreate,
		setError: setCreateError,
		formState: { errors: createErrors },
	} = useForm<CreateDriverFormData>({
		resolver: zodResolver(createDriverSchema),
		defaultValues: {
			email: "",
			phoneNumber: "",
			licenseNumber: "",
			fullName: "",
			address: "",
			nationalId: "",
			emergencyContact: "",
			password: "",
		},
	});

	const {
		control: editControl,
		handleSubmit: handleEditSubmit,
		reset: resetEdit,
		setError: setEditError,
		formState: { errors: editErrors },
	} = useForm<UpdateDriverFormData>({
		resolver: zodResolver(updateDriverSchema),
		defaultValues: {
			licenseNumber: "",
			phoneNumber: "",
			address: "",
			nationalId: "",
			emergencyContact: "",
			isActive: true,
		},
	});

	const fetchDrivers = useCallback(async () => {
		try {
			setLoading(true);
			const data = await driversApi.getAll();
			setDrivers(data);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to load drivers");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchDrivers();
	}, [fetchDrivers]);

	const handleOpenCreate = () => {
		setGeneratedPassword(null);
		resetCreate();
		setCreateDialogOpen(true);
	};

	const handleOpenEdit = async (driver: DriverProfile) => {
		setEditingDriver(driver);
		const fullDriver = await driversApi.getById(driver.id);
		resetEdit({
			licenseNumber: fullDriver.licenseNumber,
			phoneNumber: fullDriver.phoneNumber,
			address: fullDriver.address,
			nationalId: fullDriver.nationalId,
			emergencyContact: fullDriver.emergencyContact,
			isActive: fullDriver.isActive,
		});
		setEditDialogOpen(true);
	};

	const handleOpenView = async (driver: DriverProfile) => {
		const fullDriver = await driversApi.getById(driver.id);
		setSelectedDriver(fullDriver);
		setViewDialogOpen(true);
	};

	const handleDeleteClick = (driver: DriverProfile) => {
		setEditingDriver(driver);
		setDeleteDialogOpen(true);
	};

	const onCreateSubmit: any = async (data: CreateDriverFormData) => {
		setSubmitting(true);
		try {
			const result = await driversApi.create(data as CreateDriverRequest);
			setGeneratedPassword(result.temporaryPassword || null);
			setCreateDialogOpen(false);
			fetchDrivers();
		} catch (err: any) {
			if (err.errors) {
				Object.entries(err.errors).forEach(([field, messages]) => {
					const formField = field.charAt(0).toLowerCase() + field.slice(1);

					setCreateError(formField as keyof CreateDriverFormData, {
						type: "server",
						message: Array.isArray(messages) ? messages[0] : String(messages),
					});
				});

				if (!Object.keys(err.errors).length) {
					setCreateError("root", {
						message: err.message || "Validation failed",
					});
				}
			} else {
				setCreateError("root", {
					message: err.message || "Failed to create driver",
				});
			}
		} finally {
			setSubmitting(false);
		}
	};

	const onEditSubmit = async (data: UpdateDriverFormData) => {
		if (!editingDriver) return;
		setSubmitting(true);
		try {
			await driversApi.update(editingDriver.id, data as UpdateDriverRequest);
			setEditDialogOpen(false);
			fetchDrivers();
		} catch (err: any) {
			if (err.errors) {
				Object.entries(err.errors).forEach(([field, messages]) => {
					const formField = field.charAt(0).toLowerCase() + field.slice(1);

					setEditError(formField as keyof UpdateDriverFormData, {
						type: "server",
						message: Array.isArray(messages) ? messages[0] : String(messages),
					});
				});

				if (!Object.keys(err.errors).length) {
					setEditError("root", {
						message: err.message || "Validation failed",
					});
				}
			} else {
				setEditError("root", {
					message: err.message || "Failed to update driver",
				});
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!editingDriver) return;
		setSubmitting(true);
		try {
			await driversApi.delete(editingDriver.id);
			setDeleteDialogOpen(false);
			fetchDrivers();
		} catch (err: any) {
			if (err.message?.includes("active assignments")) {
				setError("Cannot deactivate driver with active assignments. Reassign or cancel assignments first.");
			} else {
				setError(err.message || "Failed to delete driver");
			}
			setDeleteDialogOpen(false);
		} finally {
			setSubmitting(false);
		}
	};

	const columns: GridColDef[] = [
		{ field: "id", headerName: "ID", flex: 0.5, minWidth: 80, sortable: true },
		{ field: "licenseNumber", headerName: "License #", flex: 1.2, minWidth: 120, sortable: true },
		{ field: "phoneNumber", headerName: "Phone", flex: 1.2, minWidth: 130, sortable: true },
		{
			field: "dateOfJoining",
			headerName: "Joined",
			flex: 1,
			minWidth: 110,
			valueFormatter: (value: any) => new Date(value).toLocaleDateString(),
		},
		{
			field: "isActive",
			headerName: "Status",
			flex: 0.8,
			minWidth: 100,
			renderCell: (params: GridRenderCellParams) => (
				<Chip label={params.value ? "Active" : "Inactive"} color={params.value ? "success" : "error"} size="small" />
			),
		},
		{
			field: "actions",
			headerName: "Actions",
			flex: 1,
			minWidth: 120,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Box>
					<Tooltip title="View Details">
						<IconButton onClick={() => handleOpenView(params.row as DriverProfile)} size="small">
							<Eye fontSize={18} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Edit">
						<IconButton onClick={() => handleOpenEdit(params.row as DriverProfile)} size="small">
							<PencilSimple fontSize={18} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Deactivate">
						<IconButton onClick={() => handleDeleteClick(params.row as DriverProfile)} size="small" color="error">
							<TrashSimple fontSize={18} />
						</IconButton>
					</Tooltip>
				</Box>
			),
		},
	];

	useEffect(() => {
		document.title = `Drivers | Dashboard | ${config.site.name}`;
	}, []);

	return (
		<Box sx={{ p: 3 }}>
			<Card>
				<CardHeader
					title="Drivers"
					action={
						<Button variant="contained" startIcon={<Plus fontSize={18} />} onClick={handleOpenCreate}>
							Add Driver
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
							rows={drivers}
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

			{/* Create Driver Dialog */}
			<Dialog open={createDialogOpen} onClose={() => !submitting && setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
				<form onSubmit={handleCreateSubmit(onCreateSubmit)}>
					<DialogTitle>Add New Driver</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="fullName"
								control={createControl}
								render={({ field }) => <TextField {...field} label="Full Name" fullWidth disabled={submitting} />}
							/>
							<Controller
								name="email"
								control={createControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Email"
										type="email"
										fullWidth
										required
										error={!!createErrors.email}
										helperText={createErrors.email?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="phoneNumber"
								control={createControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Phone Number"
										fullWidth
										required
										error={!!createErrors.phoneNumber}
										helperText={createErrors.phoneNumber?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="licenseNumber"
								control={createControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="License Number"
										fullWidth
										required
										error={!!createErrors.licenseNumber}
										helperText={createErrors.licenseNumber?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="nationalId"
								control={createControl}
								render={({ field }) => (
									<TextField {...field} label="National ID (CNIC)" fullWidth disabled={submitting} />
								)}
							/>
							<Controller
								name="address"
								control={createControl}
								render={({ field }) => (
									<TextField {...field} label="Address" fullWidth multiline rows={2} disabled={submitting} />
								)}
							/>
							<Controller
								name="emergencyContact"
								control={createControl}
								render={({ field }) => (
									<TextField {...field} label="Emergency Contact" fullWidth disabled={submitting} />
								)}
							/>
							<Controller
								name="password"
								control={createControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Password (optional)"
										type="password"
										fullWidth
										error={!!createErrors.password}
										helperText={createErrors.password?.message || "Leave empty to auto-generate"}
										disabled={submitting}
									/>
								)}
							/>
							{createErrors.root && <Alert severity="error">{createErrors.root.message}</Alert>}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" variant="contained" disabled={submitting}>
							{submitting ? <CircularProgress size={24} /> : "Create"}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			{/* Password Generated Dialog */}
			<Dialog open={!!generatedPassword} onClose={() => setGeneratedPassword(null)} maxWidth="sm" fullWidth>
				<DialogTitle>Driver Created Successfully</DialogTitle>
				<DialogContent>
					<Alert severity="success" sx={{ mb: 2 }}>
						Driver account has been created!
					</Alert>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						Please save this temporary password and share it with the driver:
					</Typography>
					<Paper sx={{ p: 2, bgcolor: "grey.100", mt: 1 }}>
						<Typography variant="h6" align="center" fontFamily="monospace">
							{generatedPassword}
						</Typography>
					</Paper>
					<Alert severity="warning" sx={{ mt: 2 }}>
						This password will not be shown again. The driver should change it after first login.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setGeneratedPassword(null)} variant="contained">
						Close
					</Button>
				</DialogActions>
			</Dialog>

			{/* Edit Driver Dialog */}
			<Dialog open={editDialogOpen} onClose={() => !submitting && setEditDialogOpen(false)} maxWidth="sm" fullWidth>
				<form onSubmit={handleEditSubmit(onEditSubmit)}>
					<DialogTitle>Edit Driver</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="licenseNumber"
								control={editControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="License Number"
										fullWidth
										error={!!editErrors.licenseNumber}
										helperText={editErrors.licenseNumber?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="phoneNumber"
								control={editControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Phone Number"
										fullWidth
										error={!!editErrors.phoneNumber}
										helperText={editErrors.phoneNumber?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="address"
								control={editControl}
								render={({ field }) => (
									<TextField {...field} label="Address" fullWidth multiline rows={2} disabled={submitting} />
								)}
							/>
							<Controller
								name="nationalId"
								control={editControl}
								render={({ field }) => (
									<TextField {...field} label="National ID (CNIC)" fullWidth disabled={submitting} />
								)}
							/>
							<Controller
								name="emergencyContact"
								control={editControl}
								render={({ field }) => (
									<TextField {...field} label="Emergency Contact" fullWidth disabled={submitting} />
								)}
							/>
							<Controller
								name="isActive"
								control={editControl}
								render={({ field }) => (
									<FormControlLabel
										control={<Switch checked={field.value} onChange={field.onChange} />}
										label="Active"
									/>
								)}
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

			{/* View Driver Dialog */}
			<Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Driver Details</DialogTitle>
				<DialogContent>
					{selectedDriver && (
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Typography variant="body1">
								<strong>Name:</strong> {selectedDriver.userName}
							</Typography>
							<Typography variant="body1">
								<strong>Email:</strong> {selectedDriver.email}
							</Typography>
							<Typography variant="body1">
								<strong>License Number:</strong> {selectedDriver.licenseNumber}
							</Typography>
							<Typography variant="body1">
								<strong>Phone Number:</strong> {selectedDriver.phoneNumber}
							</Typography>
							{selectedDriver.address && (
								<Typography variant="body1">
									<strong>Address:</strong> {selectedDriver.address}
								</Typography>
							)}
							{selectedDriver.nationalId && (
								<Typography variant="body1">
									<strong>National ID:</strong> {selectedDriver.nationalId}
								</Typography>
							)}
							{selectedDriver.emergencyContact && (
								<Typography variant="body1">
									<strong>Emergency Contact:</strong> {selectedDriver.emergencyContact}
								</Typography>
							)}
							<Typography variant="body1">
								<strong>Date of Joining:</strong> {new Date(selectedDriver.dateOfJoining).toLocaleDateString()}
							</Typography>
							<Typography variant="body1">
								<strong>Status:</strong>{" "}
								<Chip
									label={selectedDriver.isActive ? "Active" : "Inactive"}
									color={selectedDriver.isActive ? "success" : "error"}
									size="small"
								/>
							</Typography>
							<Typography variant="body1">
								<strong>Account Locked:</strong> {selectedDriver.isLockedOut ? "Yes" : "No"}
							</Typography>
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setViewDialogOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onClose={() => !submitting && setDeleteDialogOpen(false)}>
				<DialogTitle>Confirm Deactivation</DialogTitle>
				<DialogContent>
					<Typography>
						Are you sure you want to deactivate driver <strong>{editingDriver?.licenseNumber}</strong>?
					</Typography>
					<Alert severity="warning" sx={{ mt: 2 }}>
						This will soft-delete the driver and lock their account. They won't be able to log in.
					</Alert>
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
