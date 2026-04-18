import { apiClient } from "./client";

export interface Bus {
	id: number;
	busNumber: string;
	capacity: number;
	isActive: boolean;
}

export interface CreateBusRequest {
	busNumber: string;
	capacity: number;
}

export interface UpdateBusRequest {
	busNumber: string;
	capacity: number;
	isActive: boolean;
}

export const busesApi = {
	getAll: () => apiClient.get<Bus[]>("/buses"),

	getById: (id: number) => apiClient.get<Bus>(`/buses/${id}`),

	create: (data: CreateBusRequest) => apiClient.post<Bus>("/buses", data),

	update: (id: number, data: UpdateBusRequest) => apiClient.put<void>(`/buses/${id}`, data),

	delete: (id: number) => apiClient.delete<void>(`/buses/${id}`),
};
