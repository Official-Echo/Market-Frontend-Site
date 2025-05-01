import { Handlers, PageProps } from "$fresh/server.ts";
import { requireAuth } from "../utils/session.ts";
import { Role } from "../utils/roles.ts";

export const handler: Handlers<
  { role: Role; reportUrl?: string; error?: string }
> = {
  async GET(req, ctx) {
    return await requireAuth(req, ctx, async () => {
      const role = ctx.state.role as Role;
      if (role !== Role.MANAGER) {
        return ctx.render({ role, error: "Unauthorized" });
      }
      const reportUrl = "/static/dummy-report.pdf";
      try {
        const res = await fetch(new URL(reportUrl, req.url), {
          method: "HEAD",
        });
        return res.ok
          ? ctx.render({ role, reportUrl })
          : ctx.render({ role, error: "Report PDF not found" });
      } catch {
        return ctx.render({ role, error: "Failed to load report" });
      }
    });
  },
};

export default function Reports({}: PageProps<{ role: Role }>) {
  return (
    <div>
      <h1>Reports (Server-Side Placeholder)</h1>
    </div>
  );
}
