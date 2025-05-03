import { useEffect, useMemo, useState } from "preact/hooks";
import PrintButton from "../PrintButton.tsx";

interface Category {
  categoryNumber: number;
  categoryName: string;
}

interface Props {
  categories: Category[];
  onAdd: (cat: Partial<Category>) => void;
  onUpdate: (id: number, cat: Partial<Category>) => void;
  onDelete: (id: number) => void;
}

type SortConfig = {
  key: keyof Category | null;
  direction: "ascending" | "descending";
};

export default function CategoriesList(
  { categories, onAdd, onUpdate, onDelete }: Props,
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    categoryNumber: undefined,
    categoryName: "",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "categoryNumber",
    direction: "ascending",
  });

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) =>
      cat.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const sortedCategories = useMemo(() => {
    const sortableItems = [...filteredCategories];
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
  }, [filteredCategories, sortConfig]);

  const requestSort = (key: keyof Category) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIndicator = (key: keyof Category) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ↑" : " ↓";
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [target.name]: target.value,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (editingCategory) {
      onUpdate(editingCategory.categoryNumber, formData);
    } else {
      onAdd(formData);
    }
    resetForm();
  };

  const startEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      categoryNumber: cat.categoryNumber,
      categoryName: cat.categoryName,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      categoryNumber: undefined,
      categoryName: "",
    });
    setShowForm(false);
  };

  useEffect(() => {
    if (showForm && !editingCategory) {
      const numericIds = (categories || [])
        .map((cat) => cat.categoryNumber)
        .filter((num) => typeof num === "number" && !isNaN(num));

      const highestNum = numericIds.length > 0 ? Math.max(...numericIds) : 0;

      const nextNum = highestNum + 1;

      setFormData((prevData) => ({
        ...prevData,
        categoryNumber: nextNum,
      }));
    }
  }, [showForm, editingCategory, categories]);

  const reportHeaders = ["Category Number", "Category Name"];
  const getReportRows = () => {
    return sortedCategories.map(
      (cat) => [cat.categoryNumber, cat.categoryName],
    );
  };

  const reportColumnWidths = [30, 70];

  return (
    <div>
      <h1>Categories</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
          style={{ marginRight: "10px" }}
        />
        <button type="button" onClick={() => setShowForm(true)}>
          Add New Category
        </button>
      </div>

      <div className="report-actions">
        <PrintButton
          title="Categories Report"
          subtitle={`Generated on ${new Date().toLocaleDateString()}`}
          filename="zlagoda-categories-report.pdf"
          storeName="ZLAGODA Supermarket"
          footerText="Product Management Data"
          tableOptions={{
            headers: reportHeaders,
            getRows: getReportRows,
            columnWidths: reportColumnWidths,
          }}
        />
      </div>

      {showForm && (
        <div className="form-container">
          <h2>
            {editingCategory
              ? `Edit Category #${editingCategory.categoryNumber}`
              : "Add New Category"}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Category Number:</label>
                <input
                  type="number"
                  name="categoryNumber"
                  value={formData.categoryNumber ?? ""}
                  readOnly
                  style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                />
                <small
                  style={{ display: "block", marginTop: "5px", color: "#666" }}
                >
                  {editingCategory
                    ? "Category Number cannot be changed"
                    : "Category Number automatically generated"}
                </small>
              </div>

              <div className="form-group">
                <label>Category Name:</label>
                <input
                  type="text"
                  name="categoryName"
                  required
                  value={formData.categoryName}
                  onInput={handleInputChange}
                />
              </div>
            </div>

            <div className="form-buttons">
              <button type="submit">
                {editingCategory ? "Update" : "Add"}
              </button>
              <button type="button" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="categories-table-container">
        <table>
          <thead>
            <tr>
              <th
                className="clickable-header"
                onClick={() => requestSort("categoryNumber")}
              >
                Category Number{getSortDirectionIndicator("categoryNumber")}
              </th>
              <th
                className="clickable-header"
                onClick={() => requestSort("categoryName")}
              >
                Category Name{getSortDirectionIndicator("categoryName")}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((cat) => (
              <tr key={cat.categoryNumber}>
                <td>{cat.categoryNumber}</td>
                <td>{cat.categoryName}</td>
                <td className="table-action-buttons">
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                  >
                    Edit
                  </button>
                  <button
                    type="submit"
                    onClick={() =>
                      confirm(
                        "Are you sure you want to delete this category?",
                      ) &&
                      onDelete(cat.categoryNumber)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sortedCategories.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center" }}>
                  No categories found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
