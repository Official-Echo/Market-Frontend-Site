import { Handlers, PageProps } from "$fresh/server.ts";
import { requireAuth } from "../utils/session.ts";
import { Role } from "../utils/roles.ts";

import Router from "../islands/Router.tsx";

interface DashboardData {
  role: Role;
}

export const handler: Handlers<DashboardData> = {
  async GET(req, ctx) {
    return await requireAuth(req, ctx, async () => {
      const role = ctx.state.role as Role;

      return await ctx.render({ role });
    });
  },
};

export default function Dashboard({ data }: PageProps<DashboardData>) {
  return <Router initialPath="/dashboard" initialRole={data.role} />;
}
