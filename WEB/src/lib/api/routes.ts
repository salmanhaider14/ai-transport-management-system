import { apiClient } from "./client";

export interface RouteStop {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
	stopOrder: number;
}

export interface Route {
	id: number;
	name: string;
	isActive: boolean;
	stops?: RouteStop[];
}

export interface CreateRouteStopDto {
	name: string;
	latitude: number;
	longitude: number;
	stopOrder: number;
}

export interface CreateRouteRequest {
	name: string;
	stops: CreateRouteStopDto[];
}

export interface UpdateRouteRequest {
	name: string;
	isActive: boolean;
}

export interface AddRouteStopRequest {
	name: string;
	latitude: number;
	longitude: number;
	stopOrder: number;
}

export interface UpdateRouteStopRequest {
	name: string;
	latitude: number;
	longitude: number;
	stopOrder: number;
}

export const routesApi = {
	getAll: () => apiClient.get<Route[]>("/routes"),

	getById: (id: number) => apiClient.get<Route>(`/routes/${id}`),

	create: (data: CreateRouteRequest) => apiClient.post<Route>("/routes", data),

	update: (id: number, data: UpdateRouteRequest) => apiClient.put<void>(`/routes/${id}`, data),

	delete: (id: number) => apiClient.delete<void>(`/routes/${id}`),

	// Stops management
	addStop: (routeId: number, data: AddRouteStopRequest) => apiClient.post<RouteStop>(`/routes/${routeId}/stops`, data),

	updateStop: (routeId: number, stopId: number, data: UpdateRouteStopRequest) =>
		apiClient.put<void>(`/routes/${routeId}/stops/${stopId}`, data),

	deleteStop: (routeId: number, stopId: number) => apiClient.delete<void>(`/routes/${routeId}/stops/${stopId}`),
};
