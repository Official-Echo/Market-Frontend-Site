import { useEffect, useState } from "preact/hooks";
import { Role } from "../utils/roles.ts";
import { apiFetch } from "../utils/api.ts";

interface Props {
  role: Role | null;
  currentPath: string;
  navigate: (path: string) => void;
}

export default function Navbar({ role, currentPath, navigate }: Props) {
  const [showAdvancedQueries, setShowAdvancedQueries] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setShowAdvancedQueries(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/logout", { method: "POST" });

      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);

      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      globalThis.location.href = "/login";
    }
  };

  if (!role) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span onClick={() => navigate("/dashboard")}>ZLAGODA</span>
      </div>
      <div className="user-role">
        <span className="user-role-display">
          Logged as:{" "}
        </span>
        <span className="role-label">
          <strong>{role}</strong>
        </span>
      </div>
      <div className="navbar-links">
        <a
          className={currentPath === "/dashboard" ? "active" : ""}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </a>
        {role === Role.MANAGER && (
          <>
            <a
              className={currentPath === "/employees" ? "active" : ""}
              onClick={() => navigate("/employees")}
            >
              Employees
            </a>
            <a
              className={currentPath === "/categories" ? "active" : ""}
              onClick={() => navigate("/categories")}
            >
              Categories
            </a>
            <a
              className={currentPath === "/products" ? "active" : ""}
              onClick={() => navigate("/products")}
            >
              Products
            </a>
            <a
              className={currentPath === "/customers" ? "active" : ""}
              onClick={() => navigate("/customers")}
            >
              Customer Cards
            </a>
            <a
              className={currentPath === "/receipts" ? "active" : ""}
              onClick={() => navigate("/receipts")}
            >
              Receipts
            </a>
            <a
              className={currentPath === "/reports" ? "active" : ""}
              onClick={() => navigate("/reports")}
            >
              Reports
            </a>

            {showAdvancedQueries && (
              <a
                className={currentPath === "/advanced-queries" ? "active" : ""}
                onClick={() => navigate("/advanced-queries")}
              >
                Advanced Queries
              </a>
            )}
          </>
        )}
        {role === Role.CASHIER && (
          <>
            <a
              className={currentPath === "/customers" ? "active" : ""}
              onClick={() => navigate("/customers")}
            >
              Customer Cards
            </a>
            <a
              className={currentPath === "/products" ? "active" : ""}
              onClick={() => navigate("/products")}
            >
              Products
            </a>
            <a
              className={currentPath === "/receipts" ? "active" : ""}
              onClick={() => navigate("/receipts")}
            >
              Receipts
            </a>
            <a
              className={currentPath === "/sell" ? "active" : ""}
              onClick={() => navigate("/sell")}
            >
              New Sale
            </a>
          </>
        )}
        <a
          onClick={handleLogout}
          className="logout-btn"
        >
          Logout
        </a>
      </div>
    </nav>
  );
}
