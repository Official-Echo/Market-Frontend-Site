export async function apiFetch(
	endpoint: string,
	options: RequestInit = {},
	serverSideToken?: string,
) {
	const baseUrl = "http://localhost:8080";
	const headers = new Headers(options.headers);

	const token = serverSideToken ??
		(typeof document !== "undefined"
			? document.cookie.split("; ").find((row) => row.startsWith("token="))
				?.split("=")[1]
			: undefined);

	if (token)
		headers.set("Authorization", `Bearer ${token}`);

	headers.set("Content-Type", "application/json");

	const response = await fetch(`${baseUrl}${endpoint}`, {
		...options,
		headers,
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`apiFetch Error Response for ${endpoint}: ${response.status} - ${errorText}`);
		throw new Error(`API error: ${response.status} - ${errorText}`);
	}

	if (endpoint === "/api/auth/login" && options.method === "POST") {
		return response.json();
	}

	if (["POST", "PUT", "DELETE"].includes(options.method || "")) {
		const text = await response.text();
		try {
			return text ? JSON.parse(text) : {};
		} catch (_e) {
			console.warn(`apiFetch: Non-JSON response for mutation ${endpoint}: ${text}`);
			return {};
		}
	}

	return response.json();
}