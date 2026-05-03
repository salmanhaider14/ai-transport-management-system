import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL = "http://192.168.100.5:5295";

interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const token = await AsyncStorage.getItem("accessToken");

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 204) {
        return {} as T;
      }

      if (response.status === 401) {
        throw new Error("Session expired. Please login again.");
      }

      const text = await response.text();

      if (!text) {
        return {} as T;
      }

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        const error: ApiError = {
          message:
            typeof data === "string"
              ? data
              : data.title || data.message || "An error occurred",
          errors: typeof data === "object" ? data.errors : undefined,
          statusCode: response.status,
        };

        throw error;
      }

      return data as T;
    } catch (error: any) {
      if (error instanceof Error || error?.message) {
        throw error;
      }

      throw new Error("Network error. Please check your connection.");
    }
  }

  // HTTP Methods
  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
