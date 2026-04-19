import { apiClient } from "./client";

export enum AttendanceStatus {
	Present = "Present",
	Absent = "Absent",
	Late = "Late",
	OnLeave = "OnLeave",
}

export interface DriverAttendance {
	id: number;
	driverProfileId: number;
	date: string;
	status: AttendanceStatus;
	checkInTime?: string | null;
	checkOutTime?: string | null;
	remarks?: string | null;
}

export interface MarkAttendanceRequest {
	driverProfileId: number;
	date: string;
	status: AttendanceStatus;
	checkInTime?: string;
	checkOutTime?: string;
	remarks?: string;
}

export interface UpdateAttendanceRequest {
	status?: AttendanceStatus;
	checkInTime?: string;
	checkOutTime?: string;
	remarks?: string;
}

export const attendanceApi = {
	getByDriver: (driverId: number, fromDate?: string, toDate?: string) => {
		const params = new URLSearchParams();
		if (fromDate) params.append("fromDate", fromDate);
		if (toDate) params.append("toDate", toDate);
		const queryString = params.toString();
		return apiClient.get<DriverAttendance[]>(`/attendance/driver/${driverId}${queryString ? `?${queryString}` : ""}`);
	},

	mark: (data: MarkAttendanceRequest) => apiClient.post<DriverAttendance>("/attendance", data),

	update: (attendanceId: number, data: UpdateAttendanceRequest) =>
		apiClient.put<void>(`/attendance/${attendanceId}`, data),
};
