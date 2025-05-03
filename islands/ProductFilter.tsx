import { useMemo, useState } from "preact/hooks";
import { apiFetch } from "../utils/api.ts";
import { Product } from "../routes/products.tsx";
import { jsPDF } from "jspdf";
import PrintButton from "./PrintButton.tsx";
import LookupInput from "../components/LookUpInput.tsx";

export default function ProductFilter({ products }: { products: Product[] }) {
  const [selectedCategory, setSelectedCategory] = useState("");

  const [promotionalFilter, setPromotionalFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUpcFilter, setSelectedUpcFilter] = useState<string | null>(
    null,
  );

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product | "";
    direction: "ascending" | "descending";
  }>({ key: "idProduct", direction: "ascending" });

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const upcOptions = useMemo(() => {
    const uniqueUpcs = Array.from(new Set(products.map((p) => p.upc)));

    return uniqueUpcs.map((upc) => ({ upc: upc }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const categoryMatches = selectedCategory === "" ||
        p.category === selectedCategory;

      const promotionalMatches = promotionalFilter === "" ||
        (promotionalFilter === "true" && p.isPromotional) ||
        (promotionalFilter === "false" && !p.isPromotional);

      const term = searchTerm.toLowerCase();
      const searchMatches = !term ||
        p.productName.toLowerCase().includes(term) ||
        p.idProduct?.toString().includes(term) ||
        p.upc?.toLowerCase().includes(term);

      const upcMatches = selectedUpcFilter === null ||
        p.upc === selectedUpcFilter;

      return categoryMatches && promotionalMatches && searchMatches &&
        upcMatches;
    });
  }, [
    products,
    selectedCategory,
    promotionalFilter,
    searchTerm,
    selectedUpcFilter,
  ]);

  const sortedProducts = useMemo(() => {
    const productsCopy = [...filteredProducts];

    if (!sortConfig.key) return productsCopy;

    return productsCopy.sort((a, b) => {
      const key = sortConfig.key as keyof Product;

      const aValue = a[key];
      const bValue = b[key];

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
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

  const toggleItemSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (selectedItems.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
    setSelectAll(
      newSelection.size === sortedProducts.length && sortedProducts.length > 0,
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      const allIds = sortedProducts.map((p) => p.idProduct);
      setSelectedItems(new Set(allIds));
    }
    setSelectAll(!selectAll);
  };

  const generateReport = () => {
    const productsForReport = selectedItems.size > 0
      ? sortedProducts.filter((p) => selectedItems.has(p.idProduct))
      : sortedProducts;

    const doc = new jsPDF();
    doc.text("Product Report", 10, 10);

    const now = new Date();
    doc.setFontSize(10);
    doc.text(`Generated: ${now.toLocaleString()}`, 10, 18);
    doc.setFontSize(12);

    doc.text("ID", 10, 28);
    doc.text("Name", 30, 28);
    doc.text("UPC", 100, 28);
    doc.text("Price", 150, 28);
    doc.text("Qty", 175, 28);

    doc.line(10, 30, 200, 30);

    productsForReport.forEach((p, index) => {
      const y = 38 + (index * 10);
      doc.text(p.idProduct.toString(), 10, y);
      doc.text(p.productName, 30, y);
      doc.text(p.upc, 100, y);
      doc.text(`$${p.sellingPrice.toFixed(2)}`, 150, y);
      doc.text(p.quantity.toString(), 175, y);
    });

    const totalValue = productsForReport.reduce(
      (sum, p) => sum + (p.sellingPrice * p.quantity),
      0,
    );
    const totalItems = productsForReport.reduce(
      (sum, p) => sum + p.quantity,
      0,
    );

    const summaryY = 38 + (productsForReport.length * 10) + 10;
    doc.line(10, summaryY - 8, 200, summaryY - 8);
    doc.text(`Total Items: ${totalItems}`, 10, summaryY);
    doc.text(`Total Value: $${totalValue.toFixed(2)}`, 100, summaryY);

    doc.save("product-report.pdf");
  };

  const performBulkAction = (action: string) => {
    if (selectedItems.size === 0) {
      alert("No items selected");
      return;
    }

    switch (action) {
      case "export":
        generateReport();
        break;
      default:
        alert(`Action "${action}" not implemented`);
    }
  };

  const getReportRows = () => {
    const productsForReport = selectedItems.size > 0
      ? sortedProducts.filter((p) => selectedItems.has(p.idProduct))
      : sortedProducts;

    return productsForReport.map((p) => [
      p.idProduct,
      p.productName,
      p.upc,
      p.category,
      `$${p.sellingPrice.toFixed(2)}`,
      p.quantity,
      p.isPromotional ? "Yes" : "No",
      p.manufacturer || "N/A",
    ]);
  };

  const reportHeaders = [
    "ID",
    "Name",
    "UPC",
    "Category",
    "Price",
    "Quantity",
    "Promotional",
    "Manufacturer",
  ];
  const reportColumnWidths = [10, 20, 15, 10, 10, 10, 10, 15];

  const handleUpcFilterChange = (
    name: string,
    selectedValue: string | number | null,
  ) => {
    setSelectedUpcFilter(selectedValue ? String(selectedValue) : null);
  };

  return (
    <div className="product-filter">
      <h1>Products</h1>

      <div className="filter-controls">
        <div className="filter-group">
          <label>Search Products:</label>
          <input
            type="text"
            placeholder="Name, ID, or UPC..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm((e.target as HTMLInputElement).value)}
            style={{ width: "250px" }}
          />
        </div>

        <div className="filter-group">
          <label>Filter by Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory((e.target as HTMLSelectElement).value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <LookupInput
          label="Filter by UPC:"
          name="upcFilter"
          value={selectedUpcFilter}
          onChange={handleUpcFilterChange}
          options={upcOptions}
          optionValueKey="upc"
          optionLabelKey="upc"
          placeholder="Enter or select UPC"
          required={false}
          disabled={false}
          fetchError={null}
        />

        <div className="filter-group">
          <label>Promotional Status:</label>
          <select
            value={promotionalFilter}
            onChange={(e) =>
              setPromotionalFilter((e.target as HTMLSelectElement).value)}
          >
            <option value="">All Products</option>
            <option value="true">Promotional Only</option>
            <option value="false">Non-Promotional Only</option>
          </select>
        </div>
      </div>

      <div className="bulk-actions">
        <span className="selection-info">
          {selectedItems.size} of {sortedProducts.length} items selected
        </span>
        <button
          type="button"
          onClick={() => performBulkAction("export")}
          disabled={selectedItems.size === 0}
        >
          Export Selected
        </button>
      </div>

      <div className="report-actions">
        <PrintButton
          title="Product Filter Report"
          subtitle={`Filtered Products - ${new Date().toLocaleDateString()}`}
          filename="zlagoda-product-filter-report.pdf"
          storeName="ZLAGODA Supermarket"
          footerText="Product Data"
          tableOptions={{
            headers: reportHeaders,
            getRows: getReportRows,
            columnWidths: reportColumnWidths,
          }}
        />
      </div>

      <div className="product-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  disabled={sortedProducts.length === 0}
                />
              </th>
              <th
                className="clickable-header"
                onClick={() => requestSort("idProduct")}
              >
                ID{getSortDirectionIndicator("idProduct")}
              </th>
              <th
                className="clickable-header"
                onClick={() => requestSort("productName")}
              >
                Name{getSortDirectionIndicator("productName")}
              </th>
              <th
                className="clickable-header"
                onClick={() => requestSort("upc")}
              >
                UPC{getSortDirectionIndicator("upc")}
              </th>
              <th
                className="clickable-header"
                onClick={() => requestSort("category")}
              >
                Category{getSortDirectionIndicator("category")}
              </th>
              <th
                className="clickable-header"
                onClick={() => requestSort("sellingPrice")}
              >
                Price{getSortDirectionIndicator("sellingPrice")}
              </th>
              <th
                className="clickable-header"
                onClick={() => requestSort("quantity")}
              >
                Quantity{getSortDirectionIndicator("quantity")}
              </th>
              <th
                className="clickable-header"
                onClick={() => requestSort("isPromotional")}
              >
                Promotional{getSortDirectionIndicator("isPromotional")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((p: Product) => (
              <tr
                key={p.idProduct}
                className={selectedItems.has(p.idProduct) ? "selected-row" : ""}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedItems.has(p.idProduct)}
                    onChange={() => toggleItemSelection(p.idProduct)}
                  />
                </td>
                <td>{p.idProduct}</td>
                <td>{p.productName}</td>
                <td>{p.upc}</td>
                <td>{p.category}</td>
                <td>${p.sellingPrice.toFixed(2)}</td>
                <td>{p.quantity}</td>
                <td>{p.isPromotional ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedProducts.length === 0 && (
        <div className="no-data-message">
          No products found matching your filters.
        </div>
      )}
    </div>
  );
}
