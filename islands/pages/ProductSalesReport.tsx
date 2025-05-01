import { useState } from "preact/hooks";
interface SaleItem {
  receiptNumber: string;
  printDate: string;
  productNumber: number;
  sellingPrice: number;
}

interface ReportData {
  quantity: number | null;
  searchParams: { upc: string; from: string; to: string } | null;
  sales: SaleItem[];
}

interface Props {
  onCheckQuantity: (upc: string, from?: string, to?: string) => Promise<void>;
  reportData?: ReportData | null;
}

export default function ProductSalesReport({
  onCheckQuantity,
  reportData,
}: Props) {
  const [upc, setUpc] = useState(reportData?.searchParams?.upc || "");
  const [fromDate, setFromDate] = useState(
    reportData?.searchParams?.from || "",
  );
  const [toDate, setToDate] = useState(reportData?.searchParams?.to || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const [hasChecked, setHasChecked] = useState(!!reportData?.searchParams);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDetailsExpanded(false);
    setHasChecked(true);

    try {
      await onCheckQuantity(upc, fromDate, toDate);
    } catch (err) {
      console.error("Error triggering quantity check:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get quantity data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return "Not specified";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString();
    } catch (_e) {
      return "Invalid Date";
    }
  };

  const toggleDetails = () => {
    setDetailsExpanded(!detailsExpanded);
  };

  const totalValue = reportData?.sales?.reduce(
    (sum, sale) => sum + (sale.productNumber * sale.sellingPrice),
    0,
  ) || 0;

  const summaryReportHeaders = ["Parameter", "Value"];
  const getSummaryReportRows = () => {
    if (!reportData?.searchParams) return [];
    return [
      ["Product UPC", reportData.searchParams.upc],
      ["From Date", formatDate(reportData.searchParams.from)],
      ["To Date", formatDate(reportData.searchParams.to)],
      ["Quantity Sold", `${reportData.quantity ?? 0} units`],
      ["Total Value", `$${totalValue.toFixed(2)}`],
    ];
  };
  const summaryColumnWidths = [30, 70];

  const detailsReportHeaders = [
    "Receipt #",
    "Date",
    "Quantity",
    "Unit Price",
    "Total",
  ];
  const getDetailsReportRows = () => {
    return reportData?.sales?.map((sale) => [
      sale.receiptNumber,
      formatDate(sale.printDate),
      sale.productNumber,
      `$${sale.sellingPrice.toFixed(2)}`,
      `$${(sale.productNumber * sale.sellingPrice).toFixed(2)}`,
    ]) || [];
  };
  const detailsColumnWidths = [20, 20, 15, 20, 25];

  return (
    <div className="form-container">
      <h3>Check Product Sales Quantity</h3>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Product UPC:</label>
            <input
              type="text"
              value={upc}
              onChange={(e) => setUpc((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <div className="form-group">
            <label>From Date:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) =>
                setFromDate((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="form-group">
            <label>To Date:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        <div className="form-buttons">
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Checking..." : "Check Quantity"}
          </button>
        </div>
      </form>

      {isLoading && <p>Loading report data...</p>}
      {error && <div className="error-message">Error: {error}</div>}

      {!isLoading && !error && hasChecked && reportData?.searchParams && (
        <div>
          <h3>Sales Quantity Report</h3>

          <table className="report-table summary-table">
            <tbody>
              <tr>
                <th>Product UPC:</th>
                <td>{reportData.searchParams.upc}</td>
              </tr>
              <tr>
                <th>From Date:</th>
                <td>{formatDate(reportData.searchParams.from)}</td>
              </tr>
              <tr>
                <th>To Date:</th>
                <td>{formatDate(reportData.searchParams.to)}</td>
              </tr>
              <tr>
                <th>Quantity Sold:</th>
                <td>
                  <strong>{reportData.quantity ?? 0}</strong> units
                </td>
              </tr>
              <tr>
                <th>Total Value:</th>
                <td>
                  <strong>${totalValue.toFixed(2)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {reportData.sales && reportData.sales.length > 0 && (
            <div className="sales-details-container">
              <div className="collapsible-header" onClick={toggleDetails}>
                <h4>Detailed Sales Information</h4>
                <button type="button" className="toggle-button">
                  {detailsExpanded ? "▼ Collapse" : "► Expand"}
                </button>
              </div>

              {detailsExpanded && (
                <div className="sales-details-visual">
                  <table className="sales-table">
                    <thead>
                      <tr>
                        {detailsReportHeaders.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.sales.map((sale, index) => (
                        <tr key={`${sale.receiptNumber}-${index}`}>
                          <td>{sale.receiptNumber}</td>
                          <td>{formatDate(sale.printDate)}</td>
                          <td>{sale.productNumber}</td>
                          <td>${sale.sellingPrice.toFixed(2)}</td>
                          <td>
                            ${(sale.productNumber * sale.sellingPrice).toFixed(
                              2,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4}>
                          <strong>Total Value:</strong>
                        </td>
                        <td>
                          <strong>${totalValue.toFixed(2)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {reportData.sales?.length === 0 && reportData.quantity !== null && (
            <p style={{ marginTop: "15px", fontStyle: "italic" }}>
              No detailed sales records found for this period.
            </p>
          )}
        </div>
      )}

      {!isLoading && !error && hasChecked && !reportData?.searchParams && (
        <p style={{ marginTop: "15px" }}>
          No sales data found for the specified criteria.
        </p>
      )}

      <div className="report-results" style={{ display: "none" }}>
        {reportData?.searchParams && (
          <>
            <h3>Sales Quantity Report</h3>
            <table className="report-table">
              <tbody>
                <tr>
                  <th>Product UPC:</th>
                  <td>{reportData.searchParams.upc}</td>
                </tr>
                <tr>
                  <th>From Date:</th>
                  <td>{formatDate(reportData.searchParams.from)}</td>
                </tr>
                <tr>
                  <th>To Date:</th>
                  <td>{formatDate(reportData.searchParams.to)}</td>
                </tr>
                <tr>
                  <th>Quantity Sold:</th>
                  <td>
                    {reportData.quantity !== null
                      ? <strong>{reportData.quantity} units</strong>
                      : "N/A"}
                  </td>
                </tr>
                <tr>
                  <th>Total Value:</th>
                  <td>
                    <strong>${totalValue.toFixed(2)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {reportData.sales && reportData.sales.length > 0 && (
              <div className="sales-details-print">
                <h3>Detailed Sales Information</h3>
                <table className="sales-table">
                  <thead>
                    <tr>
                      {detailsReportHeaders.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sales.map((sale, index) => (
                      <tr key={`${sale.receiptNumber}-${index}-print`}>
                        <td>{sale.receiptNumber}</td>
                        <td>{formatDate(sale.printDate)}</td>
                        <td>{sale.productNumber}</td>
                        <td>${sale.sellingPrice.toFixed(2)}</td>
                        <td>
                          ${(sale.productNumber * sale.sellingPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>
                        <strong>Total Value:</strong>
                      </td>
                      <td>
                        <strong>${totalValue.toFixed(2)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {error && (
              <div className="error-message-print">
                Error: {error}
              </div>
            )}
          </>
        )}
      </div>
      {" "}
    </div>
  );
}
