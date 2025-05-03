import { FreshContext } from "$fresh/server.ts";
import { Role } from "./roles.ts";
import { fetchRole } from "./auth.ts";

export interface Session {
	token: string;
	role: Role;
}

const sessions = new Map<string, Session>();

export function getSession(req: Request): Session | undefined {
	const token = req.headers.get("Cookie")?.match(/token=([^;]+)/)?.[1];
	if (!token) return undefined;
	return sessions.get(token);
}

export function createSession(token: string, role: Role): Session {
	const session = { token, role };
	sessions.set(token, session);
	return session;
}

export function clearSession(token: string): void {
	sessions.delete(token);
}


export async function requireAuth(
	req: Request,
	ctx: FreshContext,
	next: () => Promise<Response>,
) {
	const token = req.headers.get("Cookie")?.match(/token=([^;]+)/)?.[1];

	if (!token) {

		return new Response(null, { status: 302, headers: { Location: "/" } });
	}

	try {
		const role = await fetchRole(token);

		if (!role) {

			const headers = new Headers({ Location: "/" });
			headers.set("Set-Cookie", "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
			return new Response(null, { status: 302, headers });
		}
		ctx.state.role = role;
		return await next();
	} catch (error) {
		console.error("requireAuth: Unexpected error during role fetch:", error);
		const headers = new Headers({ Location: "/" });
		headers.set("Set-Cookie", "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
		return new Response(null, { status: 302, headers });
	}
}
