import { Handlers, PageProps } from "$fresh/server.ts";
import { authenticateUser } from "../utils/auth.ts";

interface LoginData {
  error?: string;
}

export const handler: Handlers<LoginData> = {
  async POST(req, ctx) {
    const form = await req.formData();
    const username = form.get("username")?.toString() || "";
    const password = form.get("password")?.toString() || "";

    try {
      const auth = await authenticateUser(username, password);
      if (auth) {
        const headers = new Headers();

        headers.set("Set-Cookie", `token=${auth.token}; Path=/; Max-Age=1800`);
        headers.set("Location", "/dashboard");

        return new Response(null, { status: 302, headers });
      } else {

        return ctx.render({ error: "Invalid username or password" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);


      return ctx.render({ error: errorMessage || "Authentication failed" });
    }
  },

  GET(_req, ctx) {
    const token = _req.headers.get("Cookie")?.match(/token=([^;]+)/)?.[1];
    if (token) {

      return new Response(null, {
        status: 302,
        headers: { Location: "/dashboard" },
      });
    }

    return ctx.render({});
  },
};

export default function Login({ data }: PageProps<LoginData>) {
  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>ZLAGODA Login</h1>

      {data?.error && (
        <p
          class="error"
          style={{
            color: "#dc3545",
            textAlign: "center",
            padding: "10px",
            background: "#fff3f3",
            borderRadius: "4px",
            marginBottom: "15px",
            border: "1px solid #ffcfcf",
          }}
        >
          {data.error}
        </p>
      )}

      <form method="POST">
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Username:
          </label>
          <input
            type="text"
            name="username"
            required
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Password:
          </label>
          <input
            type="password"
            name="password"
            required
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <button
          type="submit"
          style={{
            background: "#1a73e8",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "4px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}
