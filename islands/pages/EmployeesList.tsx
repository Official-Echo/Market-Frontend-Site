import { useEffect, useMemo, useState } from "preact/hooks";
import PrintButton from "../PrintButton.tsx";

interface Employee {
  idEmployee: string;
  name: string;
  surname: string;
  patronymic: string;
  role: string;
  salary: number;
  phoneNumber: string;
  city: string;
  street: string;
  zipCode: string;
  dateOfBirth: string | null;
  dateOfStart: string | null;
  password: string | null;
}
interface Props {
  employees: Employee[];
  onAdd: (emp: Employee) => void;
  onUpdate: (id: string, emp: Employee) => void;
  onDelete: (id: string) => void;
}

type SortConfig = {
  key: keyof Employee | null;
  direction: "ascending" | "descending";
};

export default function EmployeesList(
  { employees, onAdd, onUpdate, onDelete }: Props,
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Employee>({
    idEmployee: "",
    name: "",
    surname: "",
    patronymic: "",
    role: "Cashier",
    salary: 0,
    phoneNumber: "",
    city: "",
    street: "",
    zipCode: "",
    dateOfBirth: null,
    dateOfStart: null,
    password: null,
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "surname",
    direction: "ascending",
  });

  useEffect(() => {
    if (showForm && !editingEmployee) {
      const numericParts = employees
        .map((emp) => {
          const match = emp.idEmployee.match(/^EMP(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => !isNaN(num));

      const highestNum = numericParts.length > 0
        ? Math.max(...numericParts)
        : 0;

      const nextNum = (highestNum + 1).toString().padStart(4, "0");
      const nextId = `EMP${nextNum}`;

      setFormData((prevData) => ({
        ...prevData,
        idEmployee: nextId,
      }));
    }
  }, [showForm, editingEmployee, employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const nameMatches = `${emp.surname} ${emp.name} ${emp.patronymic || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const roleMatches = roleFilter === "" || emp.role === roleFilter;
      return nameMatches && roleMatches;
    });
  }, [employees, searchTerm, roleFilter]);

  const sortedEmployees = useMemo(() => {
    const sortableItems = [...filteredEmployees];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue === null || aValue === undefined) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        if (bValue === null || bValue === undefined) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "ascending"
            ? aValue - bValue
            : bValue - aValue;
        }
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return 0;
      });
    }
    return sortableItems;
  }, [filteredEmployees, sortConfig]);

  const requestSort = (key: keyof Employee) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIndicator = (key: keyof Employee) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ↑" : " ↓";
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === "number"
      ? Number(target.value)
      : target.value;
    setFormData({
      ...formData,
      [target.name]: value,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (editingEmployee) {
      onUpdate(editingEmployee.idEmployee, formData);
    } else {
      onAdd(formData);
    }
    resetForm();
  };

  const startEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      idEmployee: emp.idEmployee,
      name: emp.name,
      surname: emp.surname,
      patronymic: emp.patronymic,
      role: emp.role,
      salary: emp.salary,
      phoneNumber: emp.phoneNumber,
      city: emp.city,
      street: emp.street,
      zipCode: emp.zipCode,
      dateOfBirth: emp.dateOfBirth,
      dateOfStart: emp.dateOfStart,
      password: emp.password,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      idEmployee: "",
      name: "",
      surname: "",
      patronymic: "",
      role: "Cashier",
      salary: 0,
      phoneNumber: "",
      city: "",
      street: "",
      zipCode: "",
      dateOfBirth: null,
      dateOfStart: null,
      password: null,
    });
    setShowForm(false);
  };

  const reportHeaders = [
    "ID",
    "Surname",
    "Name",
    "Patronymic",
    "Role",
    "Salary",
    "Phone",
    "City",
    "Street",
    "ZIP",
  ];
  const getReportRows = () => {
    return sortedEmployees.map((emp) => [
      emp.idEmployee,
      emp.surname,
      emp.name,
      emp.patronymic || "",
      emp.role,
      emp.salary.toString(),
      emp.phoneNumber,
      emp.city,
      emp.street,
      emp.zipCode,
    ]);
  };

  const reportColumnWidths = [8, 12, 12, 10, 10, 8, 12, 10, 10, 8];

  return (
    <div>
      <h1>Employees</h1>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
          style={{ flex: 1 }}
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter((e.target as HTMLSelectElement).value)}
          style={{ padding: "8px" }}
        >
          <option value="">All Roles</option>
          <option value="Cashier">Cashier</option>
          <option value="Manager">Manager</option>
        </select>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add New Employee
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingEmployee ? "Edit Employee" : "Add New Employee"}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Employee ID:</label>
                <input
                  type="text"
                  name="idEmployee"
                  value={formData.idEmployee}
                  readOnly
                  style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                />
                <small
                  style={{ display: "block", marginTop: "5px", color: "#666" }}
                >
                  {editingEmployee
                    ? "ID cannot be changed"
                    : "ID automatically generated for new employees"}
                </small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Surname:</label>
                <input
                  type="text"
                  name="surname"
                  required
                  value={formData.surname}
                  onInput={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onInput={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Patronymic:</label>
                <input
                  type="text"
                  name="patronymic"
                  value={formData.patronymic}
                  onInput={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Role:</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div className="form-group">
                <label>Salary:</label>
                <input
                  type="number"
                  name="salary"
                  required
                  min="0"
                  value={formData.salary}
                  onInput={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Phone Number:</label>
                <input
                  type="text"
                  name="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onInput={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City:</label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onInput={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Street:</label>
                <input
                  type="text"
                  name="street"
                  required
                  value={formData.street}
                  onInput={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Zip Code:</label>
                <input
                  type="text"
                  name="zipCode"
                  required
                  value={formData.zipCode}
                  onInput={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth:</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ""}
                  onInput={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Date of Start:</label>
                <input
                  type="date"
                  name="dateOfStart"
                  value={formData.dateOfStart || ""}
                  onInput={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Password (leave blank to keep current):</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password || ""}
                  onInput={handleInputChange}
                  placeholder={editingEmployee ? "••••••••" : ""}
                />
              </div>
            </div>

            <div className="form-buttons">
              <button type="submit">
                {editingEmployee ? "Update" : "Add"}
              </button>
              <button type="button" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="employees-table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort("idEmployee")}>
                ID{getSortDirectionIndicator("idEmployee")}
              </th>
              <th onClick={() => requestSort("surname")}>
                Name{getSortDirectionIndicator("surname")}
              </th>
              <th onClick={() => requestSort("role")}>
                Role{getSortDirectionIndicator("role")}
              </th>
              <th onClick={() => requestSort("salary")}>
                Salary{getSortDirectionIndicator("salary")}
              </th>
              <th onClick={() => requestSort("phoneNumber")}>
                Phone{getSortDirectionIndicator("phoneNumber")}
              </th>
              <th onClick={() => requestSort("city")}>
                Address{getSortDirectionIndicator("city")}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map((emp) => (
              <tr key={emp.idEmployee}>
                <td>{emp.idEmployee}</td>
                <td>
                  {`${emp.surname} ${emp.name} ${emp.patronymic || ""}`.trim()}
                </td>
                <td>{emp.role}</td>
                <td>${emp.salary?.toFixed(2)}</td>
                <td>{emp.phoneNumber}</td>
                <td>
                  {`${emp.city || ""}, ${emp.street || ""}, ${
                    emp.zipCode || ""
                  }`.trim().replace(/^, |, $/g, "")}
                </td>
                <td>
                  <button type="button" onClick={() => startEdit(emp)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirm(
                        "Are you sure you want to delete this employee?",
                      ) &&
                      onDelete(emp.idEmployee)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sortedEmployees.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center" }}>
                  No employees found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="report-actions">
        <PrintButton
          title="Employees Report"
          subtitle={`Generated on ${new Date().toLocaleDateString()}`}
          filename="zlagoda-employees-report.pdf"
          storeName="ZLAGODA Supermarket"
          footerText="Confidential - HR Data"
          tableOptions={{
            headers: reportHeaders,
            getRows: getReportRows,
            columnWidths: reportColumnWidths,
          }}
        />
      </div>
    </div>
  );
}
