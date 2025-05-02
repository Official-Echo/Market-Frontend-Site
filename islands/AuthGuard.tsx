import { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Role } from "../utils/roles.ts";

interface Props {
  initialPath: string;
  initialRole: Role | null;
  children: ComponentChildren;
  onRoleChange?: (role: Role) => void;
}

export default function AuthGuard(
  { initialPath, initialRole, children }: Props,
) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (!initialRole && initialPath !== "/" && isMounted) {

      globalThis.location.href = "/";
    }
  }, [initialRole, initialPath, isMounted]);

  if (initialPath === "/" && initialRole === null) {

    return null;
  }

  if (initialRole !== null) {
    return <>{children}</>;
  }

  return <div>Checking authentication...</div>;
}
