import { PageProps } from "$fresh/server.ts";
import Router from "../islands/Router.tsx";
import { Role } from "../utils/roles.ts";

interface AppData {
  role?: Role;
}

export default function App({ Component, data, url }: PageProps<AppData>) {
  const initialRole = data?.role ?? null;

  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ZLAGODA Supermarket Management</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div class="container">
          {url.pathname === "/" && !initialRole ? <Component /> : (
            <Router
              initialPath={url.pathname}
              initialRole={initialRole}
            />
          )}
        </div>
      </body>
    </html>
  );
}
