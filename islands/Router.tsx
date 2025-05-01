import { useEffect, useState } from "preact/hooks";
import Navbar from "../components/Navbar.tsx";
import { Role } from "../utils/roles.ts";
import AuthGuard from "./AuthGuard.tsx";
import PageRenderer from "./PageRenderer.tsx";

export default function Router(
  { initialPath, initialRole }: {
    initialPath: string;
    initialRole: Role | null;
  },
) {
  const [path, setPath] = useState(initialPath);
  const [currentRole, setCurrentRole] = useState<Role | null>(initialRole);

  const navigate = (newPath: string) => {
    if (typeof window !== "undefined") {
      globalThis.history.pushState({}, "", newPath);
      setPath(newPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        setPath(globalThis.location.pathname);
      }
    };
    if (typeof window !== "undefined") {
      globalThis.addEventListener("popstate", handlePopState);
      return () => globalThis.removeEventListener("popstate", handlePopState);
    }
  }, []);

  useEffect(() => {
    setCurrentRole(initialRole);
  }, [initialRole]);

  const handleRoleDetermined = (newRole: Role) => {
    setCurrentRole(newRole);
  };

  if (path === "/" && currentRole === null) {
    return null;
  }

  return (
    <AuthGuard
      initialPath={path}
      initialRole={currentRole}
      onRoleChange={(newRole: Role) => {
        setCurrentRole(newRole);
      }}
    >
      {currentRole && (
        <Navbar role={currentRole} currentPath={path} navigate={navigate} />
      )}
      <PageRenderer
        path={path}
        role={currentRole}
        navigate={navigate}
        onRoleDetermined={handleRoleDetermined}
      />
    </AuthGuard>
  );
}
