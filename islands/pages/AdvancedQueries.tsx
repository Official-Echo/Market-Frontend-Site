import { useState } from "preact/hooks";
import { apiFetch } from "../../utils/api.ts";
import PrintButton from "../PrintButton.tsx";

interface QueryResult {
  headers: string[];
  rows: (string | number | null)[][];
  description?: string;
  title?: string;
}

type QueryParams = {
  idEmployee?: string;
  from?: string;
  to?: string;
};

interface Props {
}

export default function AdvancedQueries(props: Props) {
  const [selectedQueryId, setSelectedQueryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<QueryResult | null>(null);

  const [queryParams, setQueryParams] = useState<QueryParams>({});

  const availableQueries = [
    {
      id: "sold_by_category",
      name: "Sales by Category (Per Employee)",
      description:
        "Shows total items sold per category by a specific employee within a date range.",
      params: ["idEmployee", "from", "to"],
      endpoint: "/api/specific_info/sold_by_category",
      mapResult: (data: any[]): QueryResult => ({
        title: "Sales by Category Report",
        headers: ["Category Number", "Category Name", "Total Sold"],
        rows: data.map((item) => [
          item.categoryNumber,
          item.categoryName,
          item.totalSold,
        ]),
      }),
    },
    {
      id: "no_discount_sales_employees",
      name: "Employees Without Discount Sales",
      description:
        "Lists employees who have not sold promotional items or processed sales with customer card discounts.",
      params: [],
      endpoint: "/api/specific_info/no_discount_sales_employees",
      mapResult: (data: any[]): QueryResult => ({
        title: "Employees Without Discount Sales Report",
        headers: [
          "ID",
          "Surname",
          "Name",
          "Patronymic",
          "Role",
          "Salary",
          "Phone",
          "City",
        ],
        rows: data.map((emp) => [
          emp.idEmployee,
          emp.surname,
          emp.name,
          emp.patronymic,
          emp.role,
          emp.salary,
          emp.phoneNumber,
          emp.city,
        ]),
      }),
    },
    {
      id: "average_cashier_sale",
      name: "Average Sale Value (Per Cashier)",
      description: "Calculates the average sale value for each cashier.",
      params: [],
      endpoint: "/api/specific_info/average_cashier_sale",
      mapResult: (data: any[]): QueryResult => ({
        title: "Average Sale Value per Cashier Report",
        headers: ["ID", "Surname", "Name", "Patronymic", "Average Sale Value"],
        rows: data.map((item) => [
          item.idEmployee,
          item.surname,
          item.name,
          item.patronymic,
          `$${Number(item.averageSale).toFixed(2)}`,
        ]),
      }),
    },
    {
      id: "unsold_without_discount",
      name: "Unsold Non-Promotional Items (After Date)",
      description:
        "Lists non-promotional items that were not sold after a specified date.",
      params: ["from"],
      endpoint: "/api/specific_info/unsold_without_discount",
      mapResult: (data: any[]): QueryResult => ({
        title: "Unsold Non-Promotional Items Report",
        headers: [
          "UPC",
          "Product Name",
          "Manufacturer",
          "Selling Price",
          "Quantity",
          "Characteristics",
        ],
        rows: data.map((item) => [
          item.upc,
          item.productName,
          item.manufacturer,
          `$${Number(item.sellingPrice).toFixed(2)}`,
          item.productsNumber,
          item.characteristics,
        ]),
      }),
    },
  ];

  const selectedQuery = availableQueries.find((q) => q.id === selectedQueryId);

  const handleQuerySelection = (e: Event) => {
    const queryId = (e.target as HTMLSelectElement).value;
    setSelectedQueryId(queryId);
    setResults(null);
    setError(null);
    setQueryParams({});
  };

  const handleParamChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setQueryParams((prev) => ({
      ...prev,
      [target.name]: target.value,
    }));
  };

  const executeQuery = async () => {
    if (!selectedQuery) {
      setError("Please select a query.");
      return;
    }

    for (const param of selectedQuery.params) {
      if (!queryParams[param as keyof QueryParams]) {
        setError(`Parameter '${param}' is required for this query.`);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const urlParams = new URLSearchParams();
      selectedQuery.params.forEach((paramKey) => {
        const value = queryParams[paramKey as keyof QueryParams];
        if (value) {
          urlParams.append(paramKey, value);
        }
      });

      const url = `${selectedQuery.endpoint}?${urlParams.toString()}`;


      const rawData = await apiFetch(url);

      if (!Array.isArray(rawData)) {
        throw new Error(
          "Invalid data format received from API (expected an array).",
        );
      }

      const mappedResult = selectedQuery.mapResult(rawData);
      setResults({ ...mappedResult, description: selectedQuery.description });
    } catch (err) {
      console.error("Error executing query:", err);
      setError(err instanceof Error ? err.message : "Failed to execute query.");
    } finally {
      setIsLoading(false);
    }
  };

  const getReportRows = () => results?.rows || [];

  const reportColumnWidths =
    results?.headers.map(() => 100 / (results.headers.length || 1)) || [];

  return (
    <div>
      <h1>Advanced Queries</h1>
      <p>Select and execute predefined complex database queries.</p>

      <div className="form-container" style={{ marginBottom: "20px" }}>
        <div className="form-row">
          <div className="form-group" style={{ flexGrow: 2 }}>
            <label htmlFor="query-select">Select Query:</label>
            <select
              id="query-select"
              value={selectedQueryId}
              onChange={handleQuerySelection}
            >
              <option value="">-- Select a Query --</option>
              {availableQueries.map((query) => (
                <option key={query.id} value={query.id}>
                  {query.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedQuery && selectedQuery.params.length > 0 && (
          <div className="form-row">
            {selectedQuery.params.includes("idEmployee") && (
              <div className="form-group">
                <label htmlFor="param-idEmployee">Employee ID:</label>
                <input
                  type="text"
                  id="param-idEmployee"
                  name="idEmployee"
                  value={queryParams.idEmployee || ""}
                  onChange={handleParamChange}
                />
              </div>
            )}
            {selectedQuery.params.includes("from") && (
              <div className="form-group">
                <label htmlFor="param-from">From Date:</label>
                <input
                  type="date"
                  id="param-from"
                  name="from"
                  value={queryParams.from || ""}
                  onChange={handleParamChange}
                />
              </div>
            )}
            {selectedQuery.params.includes("to") && (
              <div className="form-group">
                <label htmlFor="param-to">To Date:</label>
                <input
                  type="date"
                  id="param-to"
                  name="to"
                  value={queryParams.to || ""}
                  onChange={handleParamChange}
                />
              </div>
            )}
          </div>
        )}

        <div className="form-buttons">
          <button
            type="button"
            onClick={executeQuery}
            disabled={!selectedQueryId || isLoading}
          >
            {isLoading ? "Executing..." : "Execute Query"}
          </button>
        </div>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      {results && (
        <div className="query-results">
          <h2>Results for: {selectedQuery?.name}</h2>
          {results.description && (
            <p>
              <i>{results.description}</i>
            </p>
          )}
          {results.rows.length > 0
            ? (
              <>
                <div className="table-container" style={{ marginTop: "15px" }}>
                  <table>
                    <thead>
                      <tr>
                        {results.headers.map((header, index) => (
                          <th key={index}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>
                              {cell === null ? <i>NULL</i> : cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="report-actions" style={{ marginTop: "20px" }}>
                  <PrintButton
                    title={results.title || "Advanced Query Report"}
                    subtitle={`Executed on ${new Date().toLocaleDateString()}`}
                    filename={`zlagoda-query-${selectedQueryId}.pdf`}
                    storeName="ZLAGODA Supermarket"
                    footerText="Internal Report"
                    tableOptions={{
                      headers: results.headers,
                      getRows: getReportRows,
                      columnWidths: reportColumnWidths,
                    }}
                  />
                </div>
              </>
            )
            : <p>No results found for this query with the given parameters.</p>}
        </div>
      )}
    </div>
  );
}
