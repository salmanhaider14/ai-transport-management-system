// lib/auth/client.ts
"use client";

import type { User } from "@/types/user";
import { apiClient } from "@/lib/api/client";

interface LoginParams {
	email: string;
	password: string;
}

interface UserInfoResponse {
	email: string;
	isEmailConfirmed: boolean;
	roles: string[];
	phoneNumber: string | null;
	twoFactorEnabled: boolean;
}

class AuthClient {
	async signInWithPassword(params: LoginParams): Promise<{ error?: string }> {
		try {
			// Add useCookies=true to use cookie authentication
			await apiClient.post("/auth/login?useCookies=true", params);
			return {};
		} catch (err: any) {
			return { error: err.message || "Invalid email or password" };
		}
	}

	async getUser(): Promise<{ data?: User | null; error?: string }> {
		try {
			const userInfo = await apiClient.get<UserInfoResponse>("/auth/manage/info");

			const user: User = {
				id: "",
				email: userInfo.email,
				firstName: userInfo.email.split("@")[0],
				lastName: "",
				role: userInfo.roles[0] || "Student",
				roles: userInfo.roles,
			};

			return { data: user };
		} catch (err) {
			// Not authenticated
			return { data: null };
		}
	}

	async signOut(): Promise<{ error?: string }> {
		try {
			await apiClient.post("/auth/logout?useCookies=true", {});
			sessionStorage.removeItem("userRoles");
			return {};
		} catch (err) {
			return { error: "Failed to sign out" };
		}
	}

	async getUserRoles(): Promise<string[]> {
		if (typeof window !== "undefined") {
			const roles = sessionStorage.getItem("userRoles");
			if (roles) return JSON.parse(roles);
		}
		return [];
	}
}

export const authClient = new AuthClient();
