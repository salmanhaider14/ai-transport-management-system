import { apiClient } from "./client";

export interface Student {
	id: number;
	userId: string;
	sapId: string;
	fullName: string;
	department?: string;
	semester?: string;
	phoneNumber?: string;
	email?: string;
	isActive: boolean;
	createdAt: string;
}

export interface CreateStudentRequest {
	sapId: string;
	fullName: string;
	email: string;
	department?: string;
	semester?: string;
	phoneNumber?: string;
	password?: string;
}

export interface UpdateStudentRequest {
	sapId?: string;
	fullName?: string;
	department?: string;
	semester?: string;
	phoneNumber?: string;
	email?: string;
	isActive?: boolean;
}

export const studentsApi = {
	getAll: (isActive?: boolean) =>
		apiClient.get<Student[]>(`/students${isActive !== undefined ? `?isActive=${isActive}` : ""}`),

	create: (data: CreateStudentRequest) => apiClient.post<Student>("/students", data),

	update: (id: number, data: UpdateStudentRequest) => apiClient.put<void>(`/students/${id}`, data),

	delete: (id: number) => apiClient.delete<void>(`/students/${id}`),
};
