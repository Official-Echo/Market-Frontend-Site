
import { Role } from "./roles.ts";
import { requireAuth as sessionAuth } from "./session.ts";
import { apiFetch } from "./api.ts";

export const requireAuth = sessionAuth;

export async function authenticateUser(
	username: string,
	password: string,
): Promise<{ token: string; role: Role } | null> {
	try {
		const data = await apiFetch("/api/auth/login", {
			method: "POST",
			body: JSON.stringify({ username, password }),
		});

		if (data && data.token) {
			const token = data.token;
			const role = data.role === "Manager" ? Role.MANAGER : Role.CASHIER;
			return { token, role };
		}
		return null;
	} catch (error) {
		console.error("Authentication error:", error);
		return null;
	}
}

export async function fetchRole(token: string): Promise<Role | null> {
	if (!token) {
		console.error("fetchRole: No token provided.");
		return null;
	}
	try {

		const userData = await apiFetch("/api/employees/me", {}, token);
		return userData.role === "Manager" ? Role.MANAGER : Role.CASHIER;
	} catch (err) {
		console.error("Failed to fetch role:", err);
		return null;
	}
}