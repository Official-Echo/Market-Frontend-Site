import { useMemo, useState } from "preact/hooks";
import { apiFetch } from "../utils/api.ts";
import { Product } from "../routes/products.tsx";
import { jsPDF } from "jspdf";
import PrintButton from "./PrintButton.tsx";

export default function ProductFilter({ products }: { products: Product[] }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [upcLookup, setUpcLookup] = useState("");
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [promotionalFilter, setPromotionalFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product | "";
    direction: "ascending" | "descending";
  }>({ key: "idProduct", direction: "ascending" });

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filteredProducts = products.filter((p) => {
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

    return categoryMatches && promotionalMatches && searchMatches;
  });

  const sortedProducts = useMemo(() => {
    const productsCopy = [...filteredProducts];

    if (!sortConfig.key) return productsCopy;

    return productsCopy.sort((a, b) => {
      const key = sortConfig.key as keyof Product;
      if (a[key] < b[key]) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (a[key] > b[key]) {
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

    setSelectAll(newSelection.size === sortedProducts.length);
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

  const handleUpcLookup = async () => {
    const trimmedUpc = upcLookup.trim();
    if (!trimmedUpc) return;
    setProductDetails(null);

    const foundLocally = products.find((p) => p.upc === trimmedUpc);

    if (foundLocally) {
      setProductDetails(foundLocally);
      return;
    }

    try {
      const productDataFromApi = await apiFetch(
        `/api/store-products/search/${trimmedUpc}`,
      );

      if (!productDataFromApi) {
        throw new Error("Product not found via API for the given UPC.");
      }

      const partialDetails: Product = {
        idProduct: "",
        category: "N/A",
        categoryNumber: 0,

        productName: productDataFromApi.productName || "N/A",
        sellingPrice: productDataFromApi.sellingPrice ?? 0,
        quantity: productDataFromApi.productsNumber ?? 0,
        isPromotional: productDataFromApi.promotionalProduct ?? false,
        upc: trimmedUpc,
        characteristics: productDataFromApi.characteristics || "N/A",
        manufacturer: productDataFromApi.manufacturer || "N/A",
      };

      setProductDetails(partialDetails);
    } catch (err) {
      console.error("Failed to find product details by UPC:", err);
      alert(
        `Product lookup failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
      setProductDetails(null);
    }
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
    doc.text("Category", 100, 28);
    doc.text("Price", 150, 28);
    doc.text("Qty", 175, 28);

    doc.line(10, 30, 200, 30);

    productsForReport.forEach((p, index) => {
      const y = 38 + (index * 10);
      doc.text(p.idProduct.toString(), 10, y);
      doc.text(p.productName, 30, y);
      doc.text(p.category, 100, y);
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
    "Category",
    "Price",
    "Quantity",
    "Promotional",
    "Manufacturer",
  ];

  const reportColumnWidths = [10, 25, 15, 10, 10, 10, 20];

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

        <div className="filter-group">
          <label>Lookup by UPC:</label>
          <div className="search-group">
            <input
              type="text"
              value={upcLookup}
              onChange={(e) =>
                setUpcLookup((e.target as HTMLInputElement).value)}
              placeholder="Enter UPC code..."
            />
            <button type="button" onClick={handleUpcLookup}>Search</button>
          </div>
        </div>

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

      {productDetails && (
        <div className="product-detail-card">
          <h3>Product Details</h3>
          <div className="product-detail-grid">
            <div className="detail-group">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{productDetails.productName}</span>
            </div>
            <div className="detail-group">
              <span className="detail-label">Category:</span>
              <span className="detail-value">{productDetails.category}</span>
            </div>
            <div className="detail-group">
              <span className="detail-label">Price:</span>
              <span className="detail-value">
                ${productDetails.sellingPrice.toFixed(2)}
              </span>
            </div>
            <div className="detail-group">
              <span className="detail-label">Quantity:</span>
              <span className="detail-value">{productDetails.quantity}</span>
            </div>
            <div className="detail-group">
              <span className="detail-label">Promotional:</span>
              <span className="detail-value">
                {productDetails.isPromotional ? "Yes" : "No"}
              </span>
            </div>
            <div className="detail-group">
              <span className="detail-label">UPC:</span>
              <span className="detail-value">{productDetails.upc}</span>
            </div>
            <div className="detail-group">
              <span className="detail-label">Manufacturer:</span>
              <span className="detail-value">
                {productDetails.manufacturer || "N/A"}
              </span>
            </div>
            <div className="detail-group" style={{ gridColumn: "1 / -1" }}>
              <span className="detail-label">Characteristics:</span>
              <span className="detail-value">
                {productDetails.characteristics || "N/A"}
              </span>
            </div>
          </div>
          <button type="button" onClick={() => setProductDetails(null)}>
            Close
          </button>
        </div>
      )}

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

      <div className="product-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
              </th>
              <th onClick={() => requestSort("idProduct")}>
                ID{getSortDirectionIndicator("idProduct")}
              </th>
              <th onClick={() => requestSort("productName")}>
                Name{getSortDirectionIndicator("productName")}
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
          No products found. Try changing your filters.
        </div>
      )}

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
    </div>
  );
}
