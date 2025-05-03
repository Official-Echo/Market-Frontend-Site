import { useEffect, useState } from "preact/hooks";
import LookupInput, { LookupOption } from "../../components/LookUpInput.tsx";
import { apiFetch } from "../../utils/api.ts";
import PrintButton from "../PrintButton.tsx";

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

interface ProductOption extends LookupOption {
  upc: string;
  productName: string;
}

export default function ProductSalesReport({
  onCheckQuantity,
  reportData,
}: Props) {
  const [upc, setUpc] = useState<string>(reportData?.searchParams?.upc || "");
  const [fromDate, setFromDate] = useState(
    reportData?.searchParams?.from || "",
  );
  const [toDate, setToDate] = useState(reportData?.searchParams?.to || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [hasChecked, setHasChecked] = useState(!!reportData?.searchParams);

  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [productFetchError, setProductFetchError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const fetchAndCombineProducts = async () => {
      setIsProductLoading(true);
      setProductFetchError(null);
      setProductOptions([]);

      try {
        const [storeProductsData, productsData] = await Promise.all([
          apiFetch("/api/store-products/search"),
          apiFetch("/api/products/search"),
        ]);

        if (!Array.isArray(storeProductsData)) {
          throw new Error(
            "Invalid data format received from /api/store-products/search.",
          );
        }
        if (!Array.isArray(productsData)) {
          throw new Error(
            "Invalid data format received from /api/products/search.",
          );
        }

        const productNameMap = new Map<string, string>();
        (productsData as any[]).forEach((p) => {
          if (p && p.idProduct && p.productName) {
            productNameMap.set(String(p.idProduct), p.productName);
          }
        });

        const combinedOptions = (storeProductsData as any[])
          .filter((sp) =>
            sp && typeof sp.upc === "string" && sp.upc.trim() !== "" &&
            sp.idProduct
          )
          .map((sp) => {
            const productName = productNameMap.get(String(sp.idProduct));
            if (productName) {
              return {
                upc: sp.upc,
                productName: productName,
              };
            }
            return null;
          })
          .filter((option): option is ProductOption => option !== null);

        if (
          combinedOptions.length === 0 &&
          (storeProductsData.length > 0 || productsData.length > 0)
        ) {
          console.warn(
            "ProductSalesReport: Failed to combine product and store-product data. Check if 'idProduct' exists and matches in both API responses.",
          );
        } else if (
          combinedOptions.length <
            storeProductsData.filter((sp) =>
              sp && typeof sp.upc === "string" && sp.upc.trim() !== ""
            ).length
        ) {
          console.warn(
            "ProductSalesReport: Some store products with UPCs could not be matched with a product name via idProduct.",
          );
        }
        console.log(
          "ProductSalesReport: Combined Product Options for Lookup:",
          combinedOptions,
        );

        setProductOptions(combinedOptions);
      } catch (err) {
        console.error(
          "ProductSalesReport: Failed to fetch or combine products for lookup:",
          err,
        );
        setProductFetchError(
          err instanceof Error
            ? err.message
            : "Could not load product options.",
        );
      } finally {
        setIsProductLoading(false);
      }
    };

    fetchAndCombineProducts();
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!upc) {
      setError("Please select a product UPC.");
      return;
    }
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

  const handleUpcChange = (
    name: string,
    selectedValue: string | number | null,
  ) => {
    setUpc(selectedValue ? String(selectedValue) : "");
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return "Not specified";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Invalid Date";

      const utcDate = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
      );
      return utcDate.toLocaleDateString();
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
          <LookupInput
            label="Product UPC:"
            name="upc"
            value={upc}
            onChange={handleUpcChange}
            options={productOptions}
            optionValueKey="upc"
            optionLabelKey="upc"
            optionSecondaryLabelKey="productName"
            placeholder={isProductLoading
              ? "Loading products..."
              : "Enter or select UPC/Name"}
            required
            disabled={isLoading || isProductLoading}
            fetchError={productFetchError}
          />

          <div className="form-group">
            <label>From Date:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) =>
                setFromDate((e.target as HTMLInputElement).value)}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>To Date:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate((e.target as HTMLInputElement).value)}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="form-buttons">
          <button
            type="submit"
            disabled={isLoading || isProductLoading || !upc}
          >
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

                  <div className="report-actions" style={{ marginTop: "10px" }}>
                    <PrintButton
                      title="Product Sales Detail Report"
                      subtitle={`Product: ${reportData.searchParams.upc} (${
                        formatDate(reportData.searchParams.from)
                      } - ${formatDate(reportData.searchParams.to)})`}
                      filename={`zlagoda-sales-detail-${reportData.searchParams.upc}.pdf`}
                      storeName="ZLAGODA Supermarket"
                      footerText="Detailed Sales Transactions"
                      tableOptions={{
                        headers: detailsReportHeaders,
                        getRows: getDetailsReportRows,
                        columnWidths: detailsColumnWidths,
                      }}
                    />
                  </div>
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
