import { useEffect, useState } from "preact/hooks";
import { Role } from "../utils/roles.ts";
import { Product } from "../routes/products.tsx";
import { apiFetch } from "../utils/api.ts";
import ProductFilter from "./ProductFilter.tsx";
import EmployeesList from "./pages/EmployeesList.tsx";
import CategoriesList from "./pages/CategoriesList.tsx";
import CustomerCardsList from "./pages/CustomerCardsList.tsx";
import ReceiptsList from "./pages/ReceiptsList.tsx";
import NewSale from "./pages/NewSale.tsx";
import ProductManager from "./pages/ProductManager.tsx";
import ProductSalesReport from "./pages/ProductSalesReport.tsx";
import PrintButton from "./PrintButton.tsx";
import AdvancedQueries from "./pages/AdvancedQueries.tsx";

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

interface Category {
  categoryNumber: number;
  categoryName: string;
}

interface StoreProduct {
  upc: string;
  idProduct: string;
  sellingPrice: number;
  productsNumber: number;
  promotionalProduct: boolean;
  productName?: string;
  categoryName?: string;
}

interface CustomerCard {
  cardNumber: string;
  surname: string;
  name: string;
  patronymic: string;
  phoneNumber: string;
  city: string;
  street: string;
  zipCode: string;
  percent: number;
}

interface Receipt {
  receiptNumber: string;
  idEmployee: string;
  cardNumber: string | null;
  printDate: string;
  sumTotal: number;
  vat: number;
  employeeName?: string;
}

interface RouteData {
  employee?: Employee;
  employees?: Employee[];
  categories?: Category[];
  products?: Product[];
  storeProducts?: StoreProduct[];
  customerCards?: CustomerCard[];
  receipts?: Receipt[];
  reportUrl?: string;
  error?: string;
  totalSales?: number;
  Component?: any;
  props?: Record<string, unknown>;
}

interface Props {
  path: string;
  role: Role | null;
  navigate: (path: string) => void;
  onRoleDetermined: (role: Role) => void;
}

export default function PageRenderer(
  { path, role, navigate, onRoleDetermined }: Props,
) {
  const [data, setData] = useState<RouteData>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [reportData, setReportData] = useState<{
    quantity: number | null;
    searchParams: { upc: string; from: string; to: string } | null;
    sales: any[];
  }>({
    quantity: null,
    searchParams: null,
    sales: [],
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Not specified";
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const shouldFetch = path !== "/" || role !== null;

    if (shouldFetch) {
      fetchRouteData(path);
    } else {
      setLoading(false);
      setData({});
    }
  }, [path, role]);

  const fetchRouteData = async (path: string) => {
    if (path === "/" && role === null) {
      setLoading(false);
      setData({});
      return;
    }

    setLoading(true);
    try {
      const routePath = path.split("?")[0];

      const newData = await fetchDataForPath(routePath);
      setData(newData);
    } catch (err: unknown) {
      console.error("API error:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to load data";
      setData({ error: errorMessage });

      if (
        err instanceof Error &&
        (err.message.includes("401") || err.message.includes("403") ||
          err.message.includes("Unauthorized"))
      ) {
        document.cookie =
          "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        if (typeof window !== "undefined") {
          globalThis.location.href = "/";
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDataForPath = async (routePath: string): Promise<RouteData> => {
    if (routePath === "/" && role === null) {
      console.warn("fetchDataForPath called unexpectedly for login page.");
      return {};
    }

    switch (routePath) {
      case "/dashboard": {
        const dashboardData = await fetchDashboardData();

        if (dashboardData.employee?.role) {
          const fetchedRole = dashboardData.employee.role === "Manager"
            ? Role.MANAGER
            : Role.CASHIER;
          if (role !== fetchedRole) {
            onRoleDetermined(fetchedRole);
          }
        }
        return dashboardData;
      }
      case "/employees":
        if (role !== Role.MANAGER) {
          navigate("/dashboard");
          return { error: "Unauthorized" };
        }
        return await fetchEmployeesData();
      case "/categories":
        if (role !== Role.MANAGER) {
          navigate("/dashboard");
          return { error: "Unauthorized" };
        }
        return await fetchCategoriesData();
      case "/products":
        return await fetchProductsData();
      case "/customers":
        return await fetchCustomersData();
      case "/receipts":
        return await fetchReceiptsData();
      case "/sell":
        if (role !== Role.CASHIER) {
          navigate("/dashboard");
          return { error: "Unauthorized" };
        }
        return await fetchSellData();
      case "/reports":
        if (role !== Role.MANAGER) {
          navigate("/dashboard");
          return { error: "Unauthorized" };
        }

        try {
          const report = await apiFetch("/api/reports/products");
          return { reportUrl: report.reportUrl };
        } catch (_err) {
          console.warn(
            "API reports endpoint not available, will generate report locally",
          );

          try {
            const products = await apiFetch("/api/products/search?sortBy=name");
            const storeProducts = await apiFetch("/api/store-products/search");
            const categories = await apiFetch("/api/categories/search");

            const mappedProducts = products.map((p: any) => {
              const sp = storeProducts.find((sp: any) =>
                sp.idProduct === p.idProduct
              );
              const category = categories.find((c: any) =>
                c.categoryNumber === p.categoryNumber
              );

              return {
                id: p.idProduct.toString(),
                name: p.productName,
                category: category?.categoryName || p.categoryNumber.toString(),
                price: sp?.sellingPrice || 0,
                quantity: sp?.productsNumber || 0,
                isPromotional: sp?.promotionalProduct || false,
                upc: sp?.upc,
              };
            });

            return {
              products: mappedProducts,
              categories: categories,
            };
          } catch (err) {
            console.error("Failed to load product data for reports:", err);
            return {};
          }
        }
      case "/advanced-queries":
        if (role !== Role.MANAGER) {
          navigate("/dashboard");
          return { error: "Unauthorized" };
        }

        return { Component: AdvancedQueries, props: {} };
      default:
        if (role !== null) {
          navigate("/dashboard");
        } else {
          console.warn(
            `fetchDataForPath: Unknown path "${routePath}" with null role.`,
          );
        }
        return {};
    }
  };

  async function fetchDashboardData(): Promise<RouteData> {
    const employee = await apiFetch("/api/employees/me");

    if (role === Role.MANAGER) {
      try {
        const totalSales = await apiFetch("/api/receipts/total");
        return { employee, totalSales };
      } catch (err) {
        console.error("Failed to load sales data:", err);
        return { employee };
      }
    } else {
      try {
        const receipts = await apiFetch("/api/receipts/me");
        return { employee, receipts };
      } catch (err) {
        console.error("Failed to load receipts:", err);
        return { employee };
      }
    }
  }

  async function fetchEmployeesData(): Promise<RouteData> {
    const employees = await apiFetch("/api/employees/search");
    return { employees };
  }

  async function fetchCategoriesData(): Promise<RouteData> {
    const categories = await apiFetch("/api/categories/search");
    return { categories };
  }

  async function fetchProductsData(): Promise<RouteData> {
    try {
      const [products, storeProducts, categories] = await Promise.all([
        apiFetch("/api/products/search"),
        apiFetch("/api/store-products/search"),
        apiFetch("/api/categories/search"),
      ]);

      const productsMap = new Map<number, Product>(
        products.map((p: any) => [p.idProduct, p]),
      );

      const categoriesMap = new Map(
        categories.map((c: any) => [c.categoryNumber, c.categoryName]),
      );

      const combinedProducts = storeProducts.map((sp: any) => {
        const gotten = productsMap.get(sp.idProduct);
        const coreProduct = gotten as Product;
        const categoryName = coreProduct && typeof coreProduct === "object" &&
            "categoryNumber" in coreProduct
          ? categoriesMap.get(coreProduct.categoryNumber)
          : "Unknown";

        return {
          upc: sp.upc,
          sellingPrice: sp.sellingPrice,
          quantity: sp.productsNumber,
          isPromotional: sp.promotionalProduct,

          idProduct: coreProduct?.idProduct || sp.idProduct,
          productName: coreProduct?.productName || "Unknown Product",
          categoryNumber: coreProduct?.categoryNumber || 0,
          characteristics: coreProduct?.characteristics || "",
          manufacturer: coreProduct?.manufacturer || "",

          category: categoryName,
        };
      });

      return { products: combinedProducts, categories };
    } catch (error) {
      console.error("Failed to fetch products data:", error);

      return { products: [], categories: [] };
    }
  }

  async function fetchCustomersData(): Promise<RouteData> {
    const customerCards = await apiFetch("/api/customer-cards/search");
    return { customerCards };
  }

  async function fetchReceiptsData(): Promise<RouteData> {
    const receipts = role === Role.MANAGER
      ? await apiFetch("/api/receipts/search")
      : await apiFetch("/api/receipts/me");
    return { receipts };
  }

  async function fetchSellData(): Promise<RouteData> {
    const products = await apiFetch("/api/products/search") as Product[];
    const storeProducts = await apiFetch(
      "/api/store-products/search",
    ) as StoreProduct[];
    const customerCards = await apiFetch("/api/customer-cards/search");

    const mappedProducts = products.map((p: Product) => {
      const sp = storeProducts.find((sp: StoreProduct) =>
        sp.idProduct === p.idProduct
      );
      return {
        idProduct: p.idProduct.toString(),
        productName: p.productName,
        categoryNumber: p.categoryNumber,
        sellingPrice: sp?.sellingPrice || 0,
        quantity: sp?.productsNumber || 0,
        isPromotional: sp?.promotionalProduct || false,
        upc: sp?.upc || "",
        category: sp?.categoryName || "Unknown",
        characteristics: p.characteristics,
        manufacturer: p.manufacturer,
      };
    }).filter((p) => p.quantity > 0);

    return {
      products: mappedProducts,
      customerCards,
    };
  }

  const renderPage = () => {
    if (path === "/" && role === null) {
      return null;
    }

    if (data.error) {
      return (
        <div className="error-screen">
          <p className="error">{data.error}</p>
          <button type="button" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      );
    }

    const routePath = path.split("?")[0];

    switch (routePath) {
      case "/dashboard":
        return renderDashboard();
      case "/employees":
        return (
          <EmployeesList
            employees={data.employees || []}
            onAdd={(employee) => handleAddEmployee(employee)}
            onUpdate={(id, employee) => handleUpdateEmployee(id, employee)}
            onDelete={(id) => handleDeleteEmployee(id)}
          />
        );
      case "/categories":
        return (
          <CategoriesList
            categories={data.categories || []}
            onAdd={(category) => handleAddCategory(category)}
            onUpdate={(id, category) => handleUpdateCategory(id, category)}
            onDelete={(id) => handleDeleteCategory(id)}
          />
        );
      case "/products":
        return role === Role.MANAGER
          ? renderProductManager()
          : <ProductFilter products={data.products || []} />;
      case "/customers":
        return (
          <CustomerCardsList
            customerCards={data.customerCards || []}
            onAdd={handleAddCustomerCard}
            onUpdate={handleUpdateCustomerCard}
            onDelete={handleDeleteCustomerCard}
            role={role}
          />
        );
      case "/receipts":
        return (
          <ReceiptsList
            role={role}
            receipts={data.receipts || []}
            onDelete={(receiptNumber) => handleDeleteReceipt(receiptNumber)}
          />
        );
      case "/sell":
        return (
          <NewSale
            products={data.products || []}
            customerCards={data.customerCards || []}
            onCreateReceipt={(receipt) => handleCreateReceipt(receipt)}
          />
        );
      case "/reports":
        return renderReports();
      case "/advanced-queries":
        return <AdvancedQueries />;
      default:
        if (role !== null) {
          return (
            <div className="error-screen">
              <p className="error">Page not found: {routePath}</p>
              <button type="button" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </button>
            </div>
          );
        }
        return null;
    }
  };

  async function handleAddEmployee(employee: Employee) {
    try {
      await apiFetch("/api/employees", {
        method: "POST",
        body: JSON.stringify(employee),
      });
      fetchRouteData("/employees");
    } catch (err) {
      console.error("Failed to add employee:", err);
    }
  }

  async function handleUpdateEmployee(id: string, employee: Employee) {
    try {
      const currentEmployee = await apiFetch(`/api/employees/me`);

      const updatedEmployee = {
        ...currentEmployee,
        ...employee,
        idEmployee: id,
      };

      if (updatedEmployee.password === "") {
        updatedEmployee.password = null;
      }

      await apiFetch(`/api/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedEmployee),
      });

      fetchRouteData("/employees");
    } catch (err) {
      console.error("Failed to update employee:", err);
    }
  }

  async function handleDeleteEmployee(id: string) {
    try {
      await apiFetch(`/api/employees/${id}`, {
        method: "DELETE",
      });
      fetchRouteData("/employees");
    } catch (err) {
      console.error("Failed to delete employee:", err);
    }
  }

  async function handleAddCategory(category: Partial<Category>) {
    try {
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify(category),
      });
      fetchRouteData("/categories");
    } catch (err) {
      console.error("Failed to add category:", err);
    }
  }

  async function handleUpdateCategory(id: number, category: Partial<Category>) {
    try {
      await apiFetch(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(category),
      });
      fetchRouteData("/categories");
    } catch (err) {
      console.error("Failed to update category:", err);
    }
  }

  async function handleDeleteCategory(id: number) {
    try {
      await apiFetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      fetchRouteData("/categories");
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  }

  async function handleAddProduct(productData: any) {
    try {
      await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify(productData.product),
      });

      await apiFetch("/api/store-products", {
        method: "POST",
        body: JSON.stringify(productData.storeProduct),
      });

      fetchRouteData("/products");
    } catch (err) {
      console.error("Failed to add product:", err);
    }
  }
  async function fetchProductSoldQuantity(
    upc: string,
    from?: string,
    to?: string,
  ): Promise<{ quantity: number; sales: any[] }> {
    let url = `/api/receipts/quantity/${upc}`;
    if (from || to) {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      url += `?${params.toString()}`;
    }

    const quantity = await apiFetch(url);

    let salesData: any[] = [];

    try {
      let receiptsUrl = "/api/receipts/search";
      if (from || to) {
        const params = new URLSearchParams();
        if (from) params.append("from", from);
        if (to) params.append("to", to);
        receiptsUrl += `?${params.toString()}`;
      }

      const receipts = await apiFetch(receiptsUrl);

      for (const receipt of receipts) {
        const receiptDetails = await apiFetch(
          `/api/receipts/search/${receipt.receiptNumber}`,
        );

        if (receiptDetails && receiptDetails.sales) {
          const matchingSales = receiptDetails.sales.filter((sale: any) =>
            sale.upc === upc
          );

          if (matchingSales.length > 0) {
            matchingSales.forEach((sale: any) => {
              salesData.push({
                receiptNumber: receipt.receiptNumber,
                printDate: receipt.printDate,
                productNumber: sale.productNumber,
                sellingPrice: sale.sellingPrice,
              });
            });
          }
        }
      }

      return { quantity, sales: salesData };
    } catch (err) {
      console.error("Failed to fetch detailed sales data:", err);
      return { quantity, sales: [] };
    }
  }

  async function handleUpdateProduct(id: string, productData: any) {
    try {
      await apiFetch(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(productData.product),
      });

      await apiFetch(`/api/store-products/${productData.storeProduct.upc}`, {
        method: "PUT",
        body: JSON.stringify(productData.storeProduct),
      });

      fetchRouteData("/products");
    } catch (err) {
      console.error("Failed to update product:", err);
    }
  }

  async function handleDeleteProduct(id: string) {
    try {
      const product = data.products?.find((p) => p.idProduct === id);

      if (!product?.upc) {
        throw new Error("Product UPC not found");
      }

      await apiFetch(`/api/store-products/${product.upc}`, {
        method: "DELETE",
      });

      await apiFetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      fetchRouteData("/products");
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  }

  async function handleAddCustomerCard(card: Partial<CustomerCard>) {
    try {
      await apiFetch("/api/customer-cards", {
        method: "POST",
        body: JSON.stringify(card),
      });
      fetchRouteData("/customers");
    } catch (err) {
      console.error("Failed to add customer card:", err);
      alert(
        `Error adding card: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  }

  async function handleUpdateCustomerCard(
    id: string,
    card: Partial<CustomerCard>,
  ) {
    try {
      await apiFetch(`/api/customer-cards/${id}`, {
        method: "PUT",
        body: JSON.stringify(card),
      });
      fetchRouteData("/customers");
    } catch (err) {
      console.error("Failed to update customer card:", err);
      alert(
        `Error updating card: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  }

  async function handleDeleteCustomerCard(id: string) {
    try {
      await apiFetch(`/api/customer-cards/${id}`, {
        method: "DELETE",
      });
      fetchRouteData("/customers");
    } catch (err) {
      console.error("Failed to delete customer card:", err);
      alert(
        `Error deleting card: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  }

  async function handleCreateReceipt(receipt: any) {
    try {
      await apiFetch("/api/receipts", {
        method: "POST",
        body: JSON.stringify(receipt),
      });
      navigate("/receipts");
    } catch (err) {
      console.error("Failed to create receipt:", err);
    }
  }

  async function handleDeleteReceipt(receiptNumber: string) {
    try {
      await apiFetch(`/api/receipts/${receiptNumber}`, {
        method: "DELETE",
      });
      fetchRouteData("/receipts");
    } catch (err) {
      console.error("Failed to delete receipt:", err);
    }
  }

  function renderDashboard() {
    const emp = data.employee || {} as Employee;

    return (
      <div>
        <h1>Dashboard ({emp.role})</h1>
        <div class="dashboard-card">
          <h2>My Profile</h2>
          <p>
            <strong>Name:</strong>{" "}
            {`${emp.surname || ""} ${emp.name || ""} ${emp.patronymic || ""}`}
          </p>
          <p>
            <strong>Position:</strong> {emp.role || role}
          </p>
          <p>
            <strong>Salary:</strong> ${emp.salary || "N/A"}
          </p>
          <p>
            <strong>Phone:</strong> {emp.phoneNumber || "N/A"}
          </p>
          <p>
            <strong>Address:</strong>{" "}
            {`${emp.city || ""}, ${emp.street || ""}, ${emp.zipCode || ""}`}
          </p>
        </div>

        {role === Role.MANAGER && (
          <div class="dashboard-card">
            <h2>Store Summary</h2>
            <p>
              <strong>Total Sales:</strong> ${data.totalSales || 0}
            </p>
            <button type="button" onClick={() => navigate("/reports")}>
              View Reports
            </button>
          </div>
        )}

        {role === Role.CASHIER && (
          <div class="dashboard-card">
            <h2>My Activity</h2>
            <p>
              <strong>Total Receipts:</strong> {data.receipts?.length || 0}
            </p>
            <button type="button" onClick={() => navigate("/sell")}>
              New Sale
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderProductManager() {
    return (
      <ProductManager
        products={data.products || []}
        categories={data.categories || []}
        onAddProduct={(productData) => handleAddProduct(productData)}
        onUpdateProduct={(id, productData) =>
          handleUpdateProduct(id, productData)}
        onDeleteProduct={(id) => handleDeleteProduct(id)}
      />
    );
  }

  function renderReports() {
    return (
      <div>
        <h1>Reports Dashboard</h1>

        <div className="reports-menu">
          <div className="report-card">
            <h3>Products Reports</h3>
            <p>Generate comprehensive reports about products in stock</p>
            <button type="button" onClick={() => navigate("/products")}>
              View Products
            </button>
          </div>

          <div className="report-card">
            <h3>Employee Reports</h3>
            <p>Generate reports about store employees</p>
            <button type="button" onClick={() => navigate("/employees")}>
              View Employees
            </button>
          </div>

          <div className="report-card">
            <h3>Customer Cards Reports</h3>
            <p>Generate reports about customer loyalty cards</p>
            <button type="button" onClick={() => navigate("/customers")}>
              View Customer Cards
            </button>
          </div>

          <div className="report-card">
            <h3>Sales Reports</h3>
            <p>Generate reports about sales and receipts</p>
            <button type="button" onClick={() => navigate("/receipts")}>
              View Receipts
            </button>
          </div>

          <div className="report-card">
            <h3>Category Reports</h3>
            <p>Generate reports about product categories</p>
            <button type="button" onClick={() => navigate("/categories")}>
              View Categories
            </button>
          </div>
        </div>

        <div className="report-section">
          <h2>Product Sales Quantity Report</h2>
          <ProductSalesReport
            reportData={reportData}
            onCheckQuantity={async (upc, from, to) => {
              try {
                const result = await fetchProductSoldQuantity(upc, from, to);

                setReportData({
                  quantity: result.quantity,
                  searchParams: { upc, from: from || "", to: to || "" },
                  sales: result.sales || [],
                });
              } catch (err) {
                console.error("Error in onCheckQuantity:", err);
                throw err;
              }
            }}
          />

          <div className="report-actions">
            <PrintButton
              title="Sales Quantity Report"
              subtitle={`Generated on ${new Date().toLocaleDateString()}`}
              contentSelector=".report-results"
              filename="zlagoda-sales-quantity-report.pdf"
              orientation={reportData.sales?.length > 0
                ? "landscape"
                : "portrait"}
              storeName="ZLAGODA Supermarket"
              footerText="For internal use only"
              tableOptions={reportData.quantity !== null
                ? [
                  {
                    headers: ["Field", "Value"],
                    getRows: () => [
                      [
                        "Product UPC:",
                        reportData.searchParams?.upc || "Not specified",
                      ],
                      [
                        "From Date:",
                        reportData.searchParams
                          ? formatDate(reportData.searchParams.from)
                          : "Not specified",
                      ],
                      [
                        "To Date:",
                        reportData.searchParams
                          ? formatDate(reportData.searchParams.to)
                          : "Not specified",
                      ],
                      [
                        "Quantity Sold:",
                        `${
                          reportData.quantity !== null ? reportData.quantity : 0
                        } units`,
                      ],
                      [
                        "Total Value:",
                        `$${
                          reportData.sales?.reduce(
                            (sum, sale) =>
                              sum + (sale.productNumber * sale.sellingPrice),
                            0,
                          )
                            ?.toFixed(2) || "0.00"
                        }`,
                      ],
                    ],
                  },

                  ...(reportData.sales && reportData.sales.length > 0
                    ? [{
                      title: "Detailed Sales Information",
                      headers: [
                        "Receipt #",
                        "Date",
                        "Quantity",
                        "Unit Price",
                        "Total",
                      ],
                      getRows: () =>
                        reportData.sales.map((sale) => [
                          sale.receiptNumber,
                          formatDate(sale.printDate),
                          sale.productNumber.toString(),
                          `$${sale.sellingPrice.toFixed(2)}`,
                          `$${
                            (sale.productNumber * sale.sellingPrice).toFixed(2)
                          }`,
                        ]),
                      footer: `Total Value: $${
                        reportData.sales.reduce((sum, sale) =>
                          sum + (sale.productNumber * sale.sellingPrice), 0)
                          .toFixed(2)
                      }`,
                    }]
                    : []),
                ]
                : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  return renderPage();
}
