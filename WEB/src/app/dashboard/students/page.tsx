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
	FormControlLabel,
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Eye, PencilSimple, Plus, TrashSimple, UploadSimple } from "@phosphor-icons/react";
import { Controller, useForm } from "react-hook-form";
import { z as zod } from "zod";

import { config } from "@/config";
import { CreateStudentRequest, Student, studentsApi, UpdateStudentRequest } from "@/lib/api/students";

const createStudentSchema = zod.object({
	sapId: zod.string().min(1, "SAP ID is required"),
	fullName: zod.string().min(1, "Full name is required"),
	email: zod.string().min(1, "Email is required").email("Invalid email format"),
	department: zod.string().optional(),
	semester: zod.string().optional(),
	phoneNumber: zod.string().optional(),
	password: zod.string().min(6, "Password must be at least 6 characters").optional(),
});

const updateStudentSchema = zod.object({
	sapId: zod.string().min(1, "SAP ID is required").optional(),
	fullName: zod.string().min(1, "Full name is required").optional(),
	department: zod.string().optional(),
	semester: zod.string().optional(),
	phoneNumber: zod.string().optional(),
	email: zod.string().email("Invalid email format").optional(),
	isActive: zod.boolean().optional(),
});

type CreateStudentFormData = zod.infer<typeof createStudentSchema>;
type UpdateStudentFormData = zod.infer<typeof updateStudentSchema>;

export default function StudentsPage() {
	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [viewDialogOpen, setViewDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
	const [editingStudent, setEditingStudent] = useState<Student | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

	const {
		control: createControl,
		handleSubmit: handleCreateSubmit,
		reset: resetCreate,
		setError: setCreateError,
		formState: { errors: createErrors },
	} = useForm<CreateStudentFormData>({
		resolver: zodResolver(createStudentSchema),
		defaultValues: {
			sapId: "",
			fullName: "",
			email: "",
			department: "",
			semester: "",
			phoneNumber: "",
			password: "",
		},
	});

	const {
		control: editControl,
		handleSubmit: handleEditSubmit,
		reset: resetEdit,
		setError: setEditError,
		formState: { errors: editErrors },
	} = useForm<UpdateStudentFormData>({
		resolver: zodResolver(updateStudentSchema),
		defaultValues: {
			sapId: "",
			fullName: "",
			department: "",
			semester: "",
			phoneNumber: "",
			email: "",
			isActive: true,
		},
	});

	const fetchStudents = useCallback(async () => {
		try {
			setLoading(true);
			const data = await studentsApi.getAll();
			setStudents(data);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to load students");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStudents();
	}, [fetchStudents]);

	const handleOpenCreate = () => {
		setGeneratedPassword(null);
		resetCreate();
		setCreateDialogOpen(true);
	};

	const handleOpenEdit = (student: Student) => {
		setEditingStudent(student);
		resetEdit({
			sapId: student.sapId,
			fullName: student.fullName,
			department: student.department,
			semester: student.semester,
			phoneNumber: student.phoneNumber,
			email: student.email,
			isActive: student.isActive,
		});
		setEditDialogOpen(true);
	};

	const handleOpenView = (student: Student) => {
		setSelectedStudent(student);
		setViewDialogOpen(true);
	};

	const handleDeleteClick = (student: Student) => {
		setEditingStudent(student);
		setDeleteDialogOpen(true);
	};

	const onCreateSubmit = async (data: CreateStudentFormData) => {
		setSubmitting(true);
		try {
			const result = await studentsApi.create(data as CreateStudentRequest);
			//setGeneratedPassword(result.temporaryPassword || null);
			setCreateDialogOpen(false);
			fetchStudents();
			setTimeout(() => setGeneratedPassword(null), 5000);
		} catch (err: any) {
			if (err.message?.includes("already exists")) {
				if (err.message?.includes("email")) {
					setCreateError("email", { message: "Email already exists" });
				} else if (err.message?.includes("SAP")) {
					setCreateError("sapId", { message: "SAP ID already exists" });
				} else {
					setCreateError("root", { message: err.message });
				}
			} else {
				setCreateError("root", { message: err.message || "Failed to create student" });
			}
		} finally {
			setSubmitting(false);
		}
	};

	const onEditSubmit = async (data: UpdateStudentFormData) => {
		if (!editingStudent) return;
		setSubmitting(true);
		try {
			await studentsApi.update(editingStudent.id, data as UpdateStudentRequest);
			setEditDialogOpen(false);
			fetchStudents();
		} catch (err: any) {
			if (err.message?.includes("already exists")) {
				if (err.message?.includes("SAP")) {
					setEditError("sapId", { message: "SAP ID already exists" });
				} else if (err.message?.includes("Email")) {
					setEditError("email", { message: "Email already exists" });
				} else {
					setEditError("root", { message: err.message });
				}
			} else {
				setEditError("root", { message: err.message || "Failed to update student" });
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!editingStudent) return;
		setSubmitting(true);
		try {
			await studentsApi.delete(editingStudent.id);
			setDeleteDialogOpen(false);
			fetchStudents();
		} catch (err: any) {
			setError(err.message || "Failed to delete student");
			setDeleteDialogOpen(false);
		} finally {
			setSubmitting(false);
		}
	};

	const columns: GridColDef[] = [
		{ field: "id", headerName: "ID", flex: 0.5, minWidth: 70, sortable: true },
		{ field: "sapId", headerName: "SAP ID", flex: 1, minWidth: 120, sortable: true },
		{ field: "fullName", headerName: "Full Name", flex: 1.5, minWidth: 150, sortable: true },
		{ field: "email", headerName: "Email", flex: 1.5, minWidth: 180, sortable: true },
		{ field: "department", headerName: "Department", flex: 1.2, minWidth: 120, sortable: true },
		{ field: "semester", headerName: "Semester", flex: 0.8, minWidth: 90, sortable: true },
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
			field: "createdAt",
			headerName: "Joined",
			flex: 1,
			minWidth: 110,
			valueFormatter: (value: string) => new Date(value).toLocaleDateString(),
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
						<IconButton onClick={() => handleOpenView(params.row as Student)} size="small">
							<Eye fontSize={18} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Edit">
						<IconButton onClick={() => handleOpenEdit(params.row as Student)} size="small">
							<PencilSimple fontSize={18} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Deactivate">
						<IconButton onClick={() => handleDeleteClick(params.row as Student)} size="small" color="error">
							<TrashSimple fontSize={18} />
						</IconButton>
					</Tooltip>
				</Box>
			),
		},
	];

	useEffect(() => {
		document.title = `Students | Dashboard | ${config.site.name}`;
	}, []);

	return (
		<Box sx={{ p: 3 }}>
			<Card>
				<CardHeader
					title="Students"
					action={
						<Stack direction="row" spacing={2}>
							<Button variant="outlined" startIcon={<UploadSimple fontSize={18} />} disabled>
								Import CSV
							</Button>
							<Button variant="contained" startIcon={<Plus fontSize={18} />} onClick={handleOpenCreate}>
								Add Student
							</Button>
						</Stack>
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
							rows={students}
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

			{/* Create Student Dialog */}
			<Dialog open={createDialogOpen} onClose={() => !submitting && setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
				<form onSubmit={handleCreateSubmit(onCreateSubmit)}>
					<DialogTitle>Add New Student</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="sapId"
								control={createControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="SAP ID"
										fullWidth
										required
										error={!!createErrors.sapId}
										helperText={createErrors.sapId?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="fullName"
								control={createControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Full Name"
										fullWidth
										required
										error={!!createErrors.fullName}
										helperText={createErrors.fullName?.message}
										disabled={submitting}
									/>
								)}
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
								name="department"
								control={createControl}
								render={({ field }) => <TextField {...field} label="Department" fullWidth disabled={submitting} />}
							/>
							<Controller
								name="semester"
								control={createControl}
								render={({ field }) => <TextField {...field} label="Semester" fullWidth disabled={submitting} />}
							/>
							<Controller
								name="phoneNumber"
								control={createControl}
								render={({ field }) => <TextField {...field} label="Phone Number" fullWidth disabled={submitting} />}
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
				<DialogTitle>Student Created Successfully</DialogTitle>
				<DialogContent>
					<Alert severity="success" sx={{ mb: 2 }}>
						Student account has been created!
					</Alert>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						Please save this temporary password and share it with the student:
					</Typography>
					<Paper sx={{ p: 2, bgcolor: "grey.100", mt: 1 }}>
						<Typography variant="h6" align="center" fontFamily="monospace">
							{generatedPassword}
						</Typography>
					</Paper>
					<Alert severity="warning" sx={{ mt: 2 }}>
						This password will not be shown again. The student should change it after first login.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setGeneratedPassword(null)} variant="contained">
						Close
					</Button>
				</DialogActions>
			</Dialog>

			{/* Edit Student Dialog */}
			<Dialog open={editDialogOpen} onClose={() => !submitting && setEditDialogOpen(false)} maxWidth="sm" fullWidth>
				<form onSubmit={handleEditSubmit(onEditSubmit)}>
					<DialogTitle>Edit Student</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Controller
								name="sapId"
								control={editControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="SAP ID"
										fullWidth
										error={!!editErrors.sapId}
										helperText={editErrors.sapId?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="fullName"
								control={editControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Full Name"
										fullWidth
										error={!!editErrors.fullName}
										helperText={editErrors.fullName?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="email"
								control={editControl}
								render={({ field }) => (
									<TextField
										{...field}
										label="Email"
										type="email"
										fullWidth
										error={!!editErrors.email}
										helperText={editErrors.email?.message}
										disabled={submitting}
									/>
								)}
							/>
							<Controller
								name="department"
								control={editControl}
								render={({ field }) => <TextField {...field} label="Department" fullWidth disabled={submitting} />}
							/>
							<Controller
								name="semester"
								control={editControl}
								render={({ field }) => <TextField {...field} label="Semester" fullWidth disabled={submitting} />}
							/>
							<Controller
								name="phoneNumber"
								control={editControl}
								render={({ field }) => <TextField {...field} label="Phone Number" fullWidth disabled={submitting} />}
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

			{/* View Student Dialog */}
			<Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Student Details</DialogTitle>
				<DialogContent>
					{selectedStudent && (
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Typography variant="body1">
								<strong>SAP ID:</strong> {selectedStudent.sapId}
							</Typography>
							<Typography variant="body1">
								<strong>Full Name:</strong> {selectedStudent.fullName}
							</Typography>
							<Typography variant="body1">
								<strong>Email:</strong> {selectedStudent.email}
							</Typography>
							{selectedStudent.department && (
								<Typography variant="body1">
									<strong>Department:</strong> {selectedStudent.department}
								</Typography>
							)}
							{selectedStudent.semester && (
								<Typography variant="body1">
									<strong>Semester:</strong> {selectedStudent.semester}
								</Typography>
							)}
							{selectedStudent.phoneNumber && (
								<Typography variant="body1">
									<strong>Phone Number:</strong> {selectedStudent.phoneNumber}
								</Typography>
							)}
							<Typography variant="body1">
								<strong>Status:</strong>{" "}
								<Chip
									label={selectedStudent.isActive ? "Active" : "Inactive"}
									color={selectedStudent.isActive ? "success" : "error"}
									size="small"
								/>
							</Typography>
							<Typography variant="body1">
								<strong>Joined:</strong> {new Date(selectedStudent.createdAt).toLocaleDateString()}
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
						Are you sure you want to deactivate student <strong>{editingStudent?.fullName}</strong>?
					</Typography>
					<Alert severity="warning" sx={{ mt: 2 }}>
						This will soft-delete the student and lock their account. They won't be able to log in.
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
