import { useMemo, useState } from "preact/hooks";
import PrintButton from "../PrintButton.tsx";
import { Role } from "../../utils/roles.ts";

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

interface Props {
  customerCards: CustomerCard[];
  onAdd: (card: Partial<CustomerCard>) => void;
  onUpdate: (id: string, card: Partial<CustomerCard>) => void;
  onDelete: (id: string) => void;
  role: Role | null;
}

type SortConfig = {
  key: keyof CustomerCard | null;
  direction: "ascending" | "descending";
};

export default function CustomerCardsList(
  { customerCards, onAdd, onUpdate, onDelete, role }: Props,
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CustomerCard | null>(null);
  const [formData, setFormData] = useState<Partial<CustomerCard>>({
    cardNumber: "",
    surname: "",
    name: "",
    patronymic: "",
    phoneNumber: "",
    city: "",
    street: "",
    zipCode: "",
    percent: 0,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "surname",
    direction: "ascending",
  });

  const [percentFilter, setPercentFilter] = useState<string>("");

  const filteredCards = useMemo(() => {
    return (customerCards || []).filter((card) => {
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${card.surname || ""} ${card.name || ""} ${
        card.patronymic || ""
      }`.toLowerCase().trim();
      const cardMatch = typeof card?.cardNumber === "string" &&
        card.cardNumber.toLowerCase().includes(searchLower);
      const nameMatch = fullName.includes(searchLower);
      const searchMatches = nameMatch || cardMatch;

      const percentMatches = percentFilter === "" ||
        card.percent === Number(percentFilter);

      return searchMatches && percentMatches;
    });
  }, [customerCards, searchTerm, percentFilter]);

  const sortedCards = useMemo(() => {
    const sortableItems = [...filteredCards];
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
  }, [filteredCards, sortConfig]);

  const requestSort = (key: keyof CustomerCard) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIndicator = (key: keyof CustomerCard) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ↑" : " ↓";
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = target.name === "percent"
      ? Number(target.value)
      : target.value;

    setFormData({
      ...formData,
      [target.name]: value,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (editingCard) {
      onUpdate(editingCard.cardNumber, formData);
    } else {
      onAdd(formData);
    }
    resetForm();
  };

  const startEdit = (card: CustomerCard) => {
    setEditingCard(card);
    setFormData({
      cardNumber: card.cardNumber,
      surname: card.surname,
      name: card.name,
      patronymic: card.patronymic,
      phoneNumber: card.phoneNumber,
      city: card.city,
      street: card.street,
      zipCode: card.zipCode,
      percent: card.percent,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingCard(null);
    setFormData({
      cardNumber: "",
      surname: "",
      name: "",
      patronymic: "",
      phoneNumber: "",
      city: "",
      street: "",
      zipCode: "",
      percent: 0,
    });
    setShowForm(false);
  };

  const reportHeaders = [
    "Card Number",
    "Surname",
    "Name",
    "Patronymic",
    "Phone",
    "City",
    "Street",
    "ZIP",
    "Discount %",
  ];
  const getReportRows = () => {
    return sortedCards.map((card) => [
      card.cardNumber,
      card.surname,
      card.name,
      card.patronymic,
      card.phoneNumber,
      card.city,
      card.street,
      card.zipCode,
      card.percent.toString(),
    ]);
  };

  const reportColumnWidths = [15, 15, 15, 10, 12, 10, 10, 8, 5];

  return (
    <div>
      <h1>Customer Cards</h1>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flexGrow: 1 }}>
          <label
            htmlFor="customer-search"
            style={{ display: "block", marginBottom: "3px", fontSize: "0.9em" }}
          >
            Search Name/Card:
          </label>
          <input
            id="customer-search"
            type="text"
            placeholder="Search by name or card number..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ flexBasis: "120px" }}>
          <label
            htmlFor="percent-filter"
            style={{ display: "block", marginBottom: "3px", fontSize: "0.9em" }}
          >
            Filter by %:
          </label>
          <input
            id="percent-filter"
            type="number"
            placeholder="All %"
            min="0"
            max="100"
            value={percentFilter}
            onInput={(e) =>
              setPercentFilter((e.target as HTMLInputElement).value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {role === Role.MANAGER && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            style={{ alignSelf: "flex-end" }}
          >
            Add New Card
          </button>
        )}
      </div>

      {showForm && (role === Role.MANAGER || role === Role.CASHIER) && (
        <div className="form-container">
          <h2>
            {editingCard ? "Edit Customer Card" : "Add New Customer Card"}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              {!editingCard && (
                <div className="form-group">
                  <label>Card Number:</label>
                  <input
                    type="text"
                    name="cardNumber"
                    required
                    value={formData.cardNumber}
                    onInput={handleInputChange}
                  />
                </div>
              )}
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Patronymic:</label>
                <input
                  type="text"
                  name="patronymic"
                  value={formData.patronymic}
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
              <div className="form-group">
                <label>Discount Percent:</label>
                <input
                  type="number"
                  name="percent"
                  min="0"
                  max="100"
                  required
                  value={formData.percent}
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

            <div className="form-buttons">
              <button type="submit">{editingCard ? "Update" : "Add"}</button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="customer-cards-table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort("cardNumber")}>
                Card Number{getSortDirectionIndicator("cardNumber")}
              </th>
              <th onClick={() => requestSort("surname")}>
                Customer Name{getSortDirectionIndicator("surname")}
              </th>
              <th onClick={() => requestSort("phoneNumber")}>
                Phone{getSortDirectionIndicator("phoneNumber")}
              </th>
              <th onClick={() => requestSort("city")}>
                Address{getSortDirectionIndicator("city")}
              </th>
              <th onClick={() => requestSort("percent")}>
                Discount{getSortDirectionIndicator("percent")}
              </th>

              {(role === Role.MANAGER || role === Role.CASHIER) && (
                <th>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedCards.length > 0
              ? sortedCards.map((card) => (
                <tr key={card.cardNumber}>
                  <td>{card.cardNumber}</td>
                  <td>
                    {`${card.surname || ""} ${card.name || ""} ${
                      card.patronymic || ""
                    }`.trim()}
                  </td>
                  <td>{card.phoneNumber}</td>
                  <td>
                    {`${card.city || ""}, ${card.street || ""}, ${
                      card.zipCode || ""
                    }`.trim().replace(/^, |, $/g, "")}
                  </td>
                  <td>{card.percent}%</td>

                  {(role === Role.MANAGER || role === Role.CASHIER) && (
                    <td>
                      <button type="button" onClick={() => startEdit(card)}>
                        Edit
                      </button>

                      {role === Role.MANAGER && (
                        <button
                          type="button"
                          onClick={() =>
                            confirm(
                              "Are you sure you want to delete this customer card?",
                            ) &&
                            onDelete(card.cardNumber)}
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
              : (
                <tr>
                  <td
                    colSpan={role === Role.MANAGER || role === Role.CASHIER
                      ? 6
                      : 5}
                    style={{ textAlign: "center" }}
                  >
                    {customerCards && customerCards.length > 0
                      ? "No cards match the current filter."
                      : "No customer cards found."}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      <div className="report-actions">
        <PrintButton
          title="Customer Loyalty Cards Report"
          subtitle={`Generated on ${new Date().toLocaleDateString()}`}
          filename="zlagoda-customer-cards-report.pdf"
          storeName="ZLAGODA Supermarket"
          footerText="Confidential - Customer Data"
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
