import { apiClient } from "./client";

export interface DriverProfile {
	id: number;
	userId: string;
	licenseNumber: string;
	phoneNumber: string;
	address?: string;
	nationalId?: string;
	emergencyContact?: string;
	dateOfJoining: string;
	isActive: boolean;
}

export interface DriverDetail {
	id: number;
	userId: string;
	email: string;
	userName: string;
	licenseNumber: string;
	phoneNumber: string;
	address?: string;
	nationalId?: string;
	emergencyContact?: string;
	dateOfJoining: string;
	isActive: boolean;
	isLockedOut: boolean;
	temporaryPassword?: string;
}

export interface CreateDriverRequest {
	email: string;
	phoneNumber: string;
	licenseNumber: string;
	fullName?: string;
	address?: string;
	nationalId?: string;
	emergencyContact?: string;
	password?: string;
}

export interface UpdateDriverRequest {
	licenseNumber?: string;
	phoneNumber?: string;
	address?: string;
	nationalId?: string;
	emergencyContact?: string;
	isActive?: boolean;
}

export const driversApi = {
	getAll: (isActive?: boolean) =>
		apiClient.get<DriverProfile[]>(`/drivers${isActive !== undefined ? `?isActive=${isActive}` : ""}`),

	getById: (id: number) => apiClient.get<DriverDetail>(`/drivers/${id}`),

	create: (data: CreateDriverRequest) => apiClient.post<DriverDetail>("/drivers", data),

	update: (id: number, data: UpdateDriverRequest) => apiClient.put<void>(`/drivers/${id}`, data),

	delete: (id: number) => apiClient.delete<void>(`/drivers/${id}`),
};
