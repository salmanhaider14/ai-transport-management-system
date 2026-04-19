import { apiClient } from "./client";

export enum AssignmentStatus {
	Draft = "Draft",
	Scheduled = "Scheduled",
	InProgress = "InProgress",
	PartiallyCompleted = "PartiallyCompleted",
	Completed = "Completed",
	Cancelled = "Cancelled",
}

export enum TimeSlotStatus {
	Scheduled = "Scheduled",
	InProgress = "InProgress",
	Completed = "Completed",
	Skipped = "Skipped",
	Cancelled = "Cancelled",
}

export interface TimeSlot {
	id: number;
	slotNumber: number;
	busAssignmentId?: number;
	startTime: string;
	endTime: string;
	status: TimeSlotStatus;
	actualStartTime?: string | null;
	actualEndTime?: string | null;
	notes?: string | null;
}

export interface BusAssignment {
	id: number;
	busId: number;
	busNumber: string;
	routeId: number;
	routeName: string;
	driverProfileId: number;
	driverName: string;
	serviceDate: string;
	status: AssignmentStatus;
	firstSlotStart?: string | null;
	lastSlotEnd?: string | null;
	totalSlots: number;
	completedSlots: number;
	timeSlots: TimeSlot[];
}

export interface BusAssignmentSummary {
	id: number;
	busId: number;
	busNumber: string;
	routeId: number;
	routeName: string;
	driverProfileId: number;
	driverName: string;
	serviceDate: string;
	status: AssignmentStatus;
	firstSlotStart?: string | null;
	lastSlotEnd?: string | null;
	totalSlots: number;
	completedSlots: number;
}

export interface CreateTimeSlotDto {
	startTime: string;
	endTime: string;
	slotNumber: number;
	notes?: string;
}

export interface CreateAssignmentRequest {
	busId: number;
	routeId: number;
	driverProfileId: number;
	serviceDate: string;
	timeSlots: CreateTimeSlotDto[];
}

export interface UpdateAssignmentRequest {
	busId?: number;
	routeId?: number;
	driverProfileId?: number;
	serviceDate?: string;
	status?: AssignmentStatus;
}

export interface AddTimeSlotRequest {
	slotNumber: number;
	startTime: string;
	endTime: string;
	notes?: string;
}

export interface UpdateTimeSlotRequest {
	slotNumber?: number;
	startTime?: string;
	endTime?: string;
	status?: TimeSlotStatus;
	actualStartTime?: string;
	actualEndTime?: string;
	notes?: string;
}

export const assignmentsApi = {
	getAll: (filters?: {
		serviceDate?: string;
		busId?: number;
		driverId?: number;
		routeId?: number;
		status?: AssignmentStatus;
	}) => {
		const params = new URLSearchParams();
		if (filters?.serviceDate) params.append("serviceDate", filters.serviceDate);
		if (filters?.busId) params.append("busId", filters.busId.toString());
		if (filters?.driverId) params.append("driverId", filters.driverId.toString());
		if (filters?.routeId) params.append("routeId", filters.routeId.toString());
		if (filters?.status) params.append("status", filters.status);
		const queryString = params.toString();
		return apiClient.get<BusAssignmentSummary[]>(`/assignments${queryString ? `?${queryString}` : ""}`);
	},

	getById: (id: number) => apiClient.get<BusAssignment>(`/assignments/${id}`),

	create: (data: CreateAssignmentRequest) => apiClient.post<BusAssignment>("/assignments", data),

	update: (id: number, data: UpdateAssignmentRequest) => apiClient.put<void>(`/assignments/${id}`, data),

	cancel: (id: number) => apiClient.delete<void>(`/assignments/${id}`),

	// Time Slots
	addTimeSlot: (assignmentId: number, data: AddTimeSlotRequest) =>
		apiClient.post<TimeSlot>(`/assignments/${assignmentId}/slots`, data),

	getTimeSlots: (assignmentId: number) => apiClient.get<TimeSlot[]>(`/assignments/${assignmentId}/slots`),

	getTimeSlot: (assignmentId: number, slotId: number) =>
		apiClient.get<TimeSlot>(`/assignments/${assignmentId}/slots/${slotId}`),

	updateTimeSlot: (assignmentId: number, slotId: number, data: UpdateTimeSlotRequest) =>
		apiClient.put<void>(`/assignments/${assignmentId}/slots/${slotId}`, data),

	deleteTimeSlot: (assignmentId: number, slotId: number) =>
		apiClient.delete<void>(`/assignments/${assignmentId}/slots/${slotId}`),
};
