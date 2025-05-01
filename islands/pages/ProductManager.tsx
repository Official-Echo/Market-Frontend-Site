import { useMemo, useState } from "preact/hooks";
import ProductForm from "./ProductForm.tsx";
import PrintButton from "../PrintButton.tsx";
import { Product } from "../../routes/products.tsx";

interface Category {
  categoryNumber: number;
  categoryName: string;
}

interface Props {
  products: Product[];
  categories: Category[];
  onAddProduct: (data: any) => void;
  onUpdateProduct: (id: string, data: any) => void;
  onDeleteProduct: (id: string) => void;
}

type SortConfig = {
  key: keyof Product | null;
  direction: "ascending" | "descending";
};

export default function ProductManager({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "">("");

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "productName",
    direction: "ascending",
  });

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const term = searchTerm.toLowerCase();
      const nameMatch = product.productName.toLowerCase().includes(term);
      const idMatch = product.idProduct?.toString().includes(term);
      const upcMatch = product.upc?.toLowerCase().includes(term);
      const manufacturerMatch = product.manufacturer?.toLowerCase().includes(
        term,
      );

      const categoryMatch = selectedCategory === "" ||
        product.categoryNumber === selectedCategory;

      return (nameMatch || idMatch || upcMatch || manufacturerMatch) &&
        categoryMatch;
    });
  }, [products, searchTerm, selectedCategory]);

  const sortedProducts = useMemo(() => {
    const sortableItems = [...filteredProducts];
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
        if (typeof aValue === "boolean" && typeof bValue === "boolean") {
          return sortConfig.direction === "ascending"
            ? (aValue === bValue ? 0 : aValue ? -1 : 1)
            : (aValue === bValue ? 0 : aValue ? 1 : -1);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProducts, sortConfig]);

  const requestSort = (key: keyof Product) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIndicator = (key: keyof Product) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ↑" : " ↓";
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSaveProduct = (data: any) => {
    if (editingProduct) {
      onUpdateProduct(editingProduct.idProduct, data);
    } else {
      onAddProduct(data);
    }
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const reportHeaders = [
    "ID",
    "Name",
    "Manufacturer",
    "Category",
    "Price",
    "Quantity",
    "Promotional",
  ];
  const getReportRows = () => {
    return sortedProducts.map((product) => [
      product.idProduct,
      product.productName,
      product.manufacturer || "N/A",
      product.category,
      `$${product.sellingPrice?.toFixed(2)}`,
      product.quantity,
      product.isPromotional ? "Yes" : "No",
    ]);
  };

  const reportColumnWidths = [10, 25, 15, 15, 10, 10, 15];

  return (
    <div>
      <h1>Manage Products</h1>

      {!showForm
        ? (
          <>
            <div style={{ display: "flex", marginBottom: "20px", gap: "10px" }}>
              <input
                type="text"
                placeholder="Search by Name, ID, UPC, Manufacturer..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm((e.target as HTMLInputElement).value)}
                style={{ flex: 1, padding: "8px" }}
              />
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(
                      (e.target as HTMLSelectElement).value === ""
                        ? ""
                        : Number((e.target as HTMLSelectElement).value),
                    )}
                  style={{ padding: "8px" }}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option
                      key={category.categoryNumber}
                      value={category.categoryNumber}
                    >
                      {category.categoryName}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={handleAddProduct}>
                Add New Product
              </button>
            </div>

            <div className="report-actions">
              <PrintButton
                title="Products Management Report"
                subtitle={`Complete Product Catalog - ${
                  new Date().toLocaleDateString()
                }`}
                filename="zlagoda-products-management-report.pdf"
                storeName="ZLAGODA Supermarket"
                footerText="Product Management Data - Confidential"
                tableOptions={{
                  headers: reportHeaders,
                  getRows: getReportRows,
                  columnWidths: reportColumnWidths,
                }}
              />
            </div>

            <div className="product-manager-table-container">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => requestSort("idProduct")}>
                      ID{getSortDirectionIndicator("idProduct")}
                    </th>
                    <th onClick={() => requestSort("productName")}>
                      Name{getSortDirectionIndicator("productName")}
                    </th>
                    <th onClick={() => requestSort("manufacturer")}>
                      Manufacturer{getSortDirectionIndicator("manufacturer")}
                    </th>
                    <th onClick={() => requestSort("category")}>
                      Category{getSortDirectionIndicator("category")}
                    </th>
                    <th onClick={() => requestSort("sellingPrice")}>
                      Price{getSortDirectionIndicator("sellingPrice")}
                    </th>
                    <th onClick={() => requestSort("quantity")}>
                      Quantity{getSortDirectionIndicator("quantity")}
                    </th>
                    <th onClick={() => requestSort("isPromotional")}>
                      Promotional{getSortDirectionIndicator("isPromotional")}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((product) => (
                    <tr key={product.idProduct}>
                      <td>{product.idProduct}</td>
                      <td>{product.productName}</td>
                      <td>{product.manufacturer || "N/A"}</td>
                      <td>{product.category}</td>
                      <td>${product.sellingPrice?.toFixed(2)}</td>
                      <td>{product.quantity}</td>
                      <td>{product.isPromotional ? "Yes" : "No"}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleEditProduct(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirm(
                              `Are you sure you want to delete product ${product.productName}?`,
                            ) &&
                            onDeleteProduct(product.idProduct)}
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sortedProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center" }}>
                        No products found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )
        : (
          <ProductForm
            categories={categories}
            product={editingProduct || undefined}
            products={products}
            onSave={handleSaveProduct}
            onCancel={handleCancelForm}
          />
        )}
    </div>
  );
}
