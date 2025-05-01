import { useEffect, useMemo, useState } from "preact/hooks";
import { apiFetch } from "../../utils/api.ts";
import { Role } from "../../utils/roles.ts";

import PrintButton from "../PrintButton.tsx";

interface Receipt {
  receiptNumber: string;
  idEmployee: string;
  cardNumber: string | null;
  printDate: string;
  sumTotal: number;
  vat: number;
  employeeName?: string;
}

interface Props {
  receipts: Receipt[];
  onDelete: (receiptNumber: string) => void;
  role: Role | null;
}

type SortConfig = {
  key: keyof Receipt | null;
  direction: "ascending" | "descending";
};

export default function ReceiptsList({ receipts, onDelete, role }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [productNamesMap, setProductNamesMap] = useState<
    Record<string, string>
  >({});
  const [namesLoading, setNamesLoading] = useState<boolean>(false);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "printDate",
    direction: "descending",
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const term = searchTerm.toLowerCase();
      const searchMatch = !term ||
        receipt.receiptNumber.toLowerCase().includes(term) ||
        (receipt.employeeName || receipt.idEmployee).toLowerCase().includes(
          term,
        ) ||
        (receipt.cardNumber || "").toLowerCase().includes(term);

      const fromDate = dateFilter.from ? new Date(dateFilter.from) : null;
      const toDate = dateFilter.to ? new Date(dateFilter.to) : null;
      const receiptDate = new Date(receipt.printDate);

      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);
      receiptDate.setHours(0, 0, 0, 0);

      const dateMatch = (!fromDate || receiptDate >= fromDate) &&
        (!toDate || receiptDate <= toDate);

      return searchMatch && dateMatch;
    });
  }, [receipts, searchTerm, dateFilter]);

  const sortedReceipts = useMemo(() => {
    const sortableItems = [...filteredReceipts];
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

        if (sortConfig.key === "printDate") {
          const dateA = new Date(aValue as string).getTime();
          const dateB = new Date(bValue as string).getTime();
          return sortConfig.direction === "ascending"
            ? dateA - dateB
            : dateB - dateA;
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
  }, [filteredReceipts, sortConfig]);

  const requestSort = (key: keyof Receipt) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIndicator = (key: keyof Receipt) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ↑" : " ↓";
  };

  const reportHeaders = [
    "Receipt #",
    "Date",
    "Employee",
    "Customer Card",
    "Total",
    "VAT",
  ];
  const getReportRows = () => {
    return sortedReceipts.map((receipt) => [
      receipt.receiptNumber,
      formatDate(receipt.printDate),
      receipt.employeeName || receipt.idEmployee,
      receipt.cardNumber || "No card",
      receipt.sumTotal.toFixed(2),
      receipt.vat.toFixed(2),
    ]);
  };

  const reportColumnWidths = [15, 20, 20, 15, 15, 15];

  const totalSum = useMemo(() => {
    return sortedReceipts.reduce((sum, receipt) => sum + receipt.sumTotal, 0);
  }, [sortedReceipts]);

  const handleFilterToday = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    setDateFilter({ from: todayStr, to: todayStr });
  };

  const handleViewDetails = async (receiptNumber: string) => {
    if (selectedReceipt === receiptNumber) {
      setSelectedReceipt(null);
      setReceiptDetails(null);
      setDetailsError(null);
      setProductNamesMap({});
      setNamesLoading(false);
    } else {
      setSelectedReceipt(receiptNumber);
      setDetailsLoading(true);
      setReceiptDetails(null);
      setDetailsError(null);
      setProductNamesMap({});
      setNamesLoading(false);

      try {
        const details = await apiFetch(`/api/receipts/search/${receiptNumber}`);
        setReceiptDetails(details);
      } catch (err) {
        console.error("Failed to fetch receipt details:", err);
        setDetailsError(
          err instanceof Error ? err.message : "Failed to load details",
        );
      } finally {
        setDetailsLoading(false);
      }
    }
  };

  const fetchProductNames = async (sales: any[]) => {
    if (!sales || sales.length === 0) {
      return;
    }

    const uniqueUpcs = Array.from(new Set(sales.map((item) => item.upc)));
    if (uniqueUpcs.length === 0) {
      return;
    }

    setNamesLoading(true);
    const namesMap: Record<string, string> = {};

    try {
      const productInfoPromises = uniqueUpcs.map((upc) =>
        apiFetch(`/api/store-products/search/${upc}`)
          .then((result) => {
            return { ...result, upc };
          })
          .catch((err) => {
            console.error(`Failed to fetch name for UPC ${upc}:`, err);
            return null;
          })
      );

      const productInfos = await Promise.all(productInfoPromises);

      productInfos.forEach((info) => {
        if (info && info.upc && info.productName) {
          namesMap[info.upc] = info.productName;
        }
      });

      setProductNamesMap(namesMap);
    } catch (err) {
      console.error("Error fetching product names:", err);
    } finally {
      setNamesLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setDateFilter({ from: "", to: "" });
  };

  return (
    <div>
      <h1>Receipts</h1>

      <div className="form-container">
        <div className="form-row">
          <div className="form-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by receipt number or employee..."
              value={searchTerm}
              onInput={(e) =>
                setSearchTerm((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="form-group">
            <label>From Date:</label>
            <input
              type="date"
              value={dateFilter.from}
              onChange={(e) =>
                setDateFilter({
                  ...dateFilter,
                  from: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
          <div className="form-group">
            <label>To Date:</label>
            <input
              type="date"
              value={dateFilter.to}
              onChange={(e) =>
                setDateFilter({
                  ...dateFilter,
                  to: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
        </div>
        <div className="form-buttons">
          <button type="button" onClick={handleFilterToday}>
            Today's Receipts
          </button>

          <button type="reset" onClick={resetFilters}>Reset Filters</button>
        </div>
      </div>

      <div className="receipts-table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort("receiptNumber")}>
                Receipt Number{getSortDirectionIndicator("receiptNumber")}
              </th>
              <th onClick={() => requestSort("printDate")}>
                Date{getSortDirectionIndicator("printDate")}
              </th>
              <th onClick={() => requestSort("employeeName")}>
                Employee{getSortDirectionIndicator("employeeName")}
              </th>
              <th onClick={() => requestSort("cardNumber")}>
                Customer Card{getSortDirectionIndicator("cardNumber")}
              </th>
              <th onClick={() => requestSort("sumTotal")}>
                Total{getSortDirectionIndicator("sumTotal")}
              </th>
              <th onClick={() => requestSort("vat")}>
                VAT{getSortDirectionIndicator("vat")}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedReceipts.map((receipt) => (
              <>
                <tr key={receipt.receiptNumber}>
                  <td>{receipt.receiptNumber}</td>
                  <td>{formatDate(receipt.printDate)}</td>
                  <td>{receipt.employeeName || receipt.idEmployee}</td>
                  <td>{receipt.cardNumber || "No card"}</td>
                  <td>${receipt.sumTotal.toFixed(2)}</td>
                  <td>${receipt.vat.toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleViewDetails(receipt.receiptNumber)}
                    >
                      {selectedReceipt === receipt.receiptNumber
                        ? "Hide Details"
                        : "View Details"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        confirm(
                          "Are you sure you want to delete this receipt?",
                        ) &&
                        onDelete(receipt.receiptNumber)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {selectedReceipt === receipt.receiptNumber && (
                  <tr className="details-row">
                    <td colSpan={7}>
                      <div className="receipt-details">
                        <h3>Receipt Details</h3>

                        <p>
                          <strong>Receipt Number:</strong>{" "}
                          {receipt.receiptNumber}
                        </p>
                        <p>
                          <strong>Date:</strong> {formatDate(receipt.printDate)}
                        </p>
                        <p>
                          <strong>Employee:</strong>{" "}
                          {receipt.employeeName || receipt.idEmployee}
                        </p>
                        <p>
                          <strong>Customer Card:</strong>{" "}
                          {receipt.cardNumber || "No card"}
                        </p>
                        <p>
                          <strong>Total Amount:</strong>{" "}
                          ${receipt.sumTotal.toFixed(2)}
                        </p>
                        <p>
                          <strong>VAT:</strong> ${receipt.vat.toFixed(2)}
                        </p>
                        <p>
                          <strong>Total Amount with VAT:</strong>{" "}
                          ${(receipt.sumTotal + receipt.vat).toFixed(2)}
                        </p>

                        <h4>Purchased Items</h4>
                        {detailsLoading && <p>Loading item details...</p>}
                        {detailsError && (
                          <p className="error-message">Error: {detailsError}</p>
                        )}

                        {receiptDetails && receiptDetails.sales &&
                          receiptDetails.sales.length > 0 && (
                          <table className="sales-table-details">
                            <thead>
                              <tr>
                                <th>UPC</th>

                                {(namesLoading ||
                                  Object.keys(productNamesMap).length > 0) && (
                                  <th>Product Name</th>
                                )}
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {receiptDetails.sales.map((
                                item: any,
                                index: number,
                              ) => (
                                <tr key={`${item.upc}-${index}`}>
                                  <td>{item.upc}</td>

                                  {(namesLoading ||
                                    Object.keys(productNamesMap).length > 0) &&
                                    (
                                      <td
                                        className="product-name-cell"
                                        title={productNamesMap[item.upc] ||
                                          (namesLoading
                                            ? "Loading..."
                                            : "Name not available")}
                                      >
                                        {productNamesMap[item.upc]
                                          ? (
                                            <span>
                                              {productNamesMap[item.upc]}
                                            </span>
                                          )
                                          : (namesLoading
                                            ? <i>Loading...</i>
                                            : (
                                              <span style={{ color: "#888" }}>
                                                N/A
                                              </span>
                                            ))}
                                      </td>
                                    )}
                                  <td>{item.productNumber}</td>
                                  <td>${item.sellingPrice.toFixed(2)}</td>
                                  <td>
                                    ${(item.productNumber * item.sellingPrice)
                                      .toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {receiptDetails &&
                          (!receiptDetails.sales ||
                            receiptDetails.sales.length === 0) &&
                          <p>No items found for this receipt.</p>}

                        {receiptDetails && receiptDetails.sales &&
                          receiptDetails.sales.length > 0 &&
                          !namesLoading &&
                          Object.keys(productNamesMap).length === 0 && (
                          <p>
                            <small>
                              Note: Product names require an additional lookup
                              based on UPC.
                            </small>
                          </p>
                        )}

                        {receiptDetails && receiptDetails.sales &&
                          receiptDetails.sales.length > 0 &&
                          !namesLoading &&
                          Object.keys(productNamesMap).length === 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              fetchProductNames(receiptDetails.sales)}
                            style={{ marginTop: "10px", marginRight: "10px" }}
                          >
                            Load Product Names
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceipt(null);
                            setReceiptDetails(null);
                            setDetailsError(null);
                            setProductNamesMap({});
                            setNamesLoading(false);
                          }}
                          style={{ marginTop: "10px" }}
                        >
                          Close Details
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {sortedReceipts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center" }}>
                  No receipts found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                <strong>Total:</strong>
              </td>
              <td colSpan={3}>
                <strong>${totalSum.toFixed(2)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="report-actions">
        <PrintButton
          title="Receipts Report"
          subtitle={`Filtered Receipts - ${new Date().toLocaleDateString()}`}
          contentSelector=".receipts-table-container"
          filename="zlagoda-receipts-report.pdf"
          storeName="ZLAGODA Supermarket"
          footerText="Sales Data - Confidential"
          tableOptions={{
            headers: reportHeaders,
            getRows: getReportRows,
            columnWidths: reportColumnWidths,
            autoTableOptions: {
              didParseCell: (data: any) => {
                if (data.section === "foot" && data.column.index === 4) {
                  data.cell.styles.halign = "right";
                }
              },
              footStyles: { fontStyle: "bold", fillColor: [240, 240, 240] },
              foot: [
                [
                  {
                    content: "Total:",
                    colSpan: 4,
                    styles: { halign: "right" },
                  },
                  {
                    content: `$${totalSum.toFixed(2)}`,
                    colSpan: 2,
                    styles: { halign: "right" },
                  },
                ],
              ],
            },
          }}
        />
      </div>

      {filteredReceipts.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          No receipts found.
        </p>
      )}

      <style>
        {`
        .receipt-details {
          background-color: #f9f9f9;
          border-radius: 4px;
          margin: 10px 0;
        }
        .details-row {
          background-color: #f9f9f9;
        }
      `}
      </style>
    </div>
  );
}
