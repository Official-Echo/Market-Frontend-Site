import { useEffect, useState } from "preact/hooks";
import { Product } from "../../routes/products.tsx";
import { apiFetch } from "../../utils/api.ts";

interface CustomerCard {
  cardNumber: string;
  surname: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ReceiptItem {
  upc: string;
  sellingPrice: number;
  productNumber: number;
}

interface Receipt {
  receiptNumber: string | null;
  idEmployee: string | null;
  cardNumber: string | null;
  printDate: string;
  sumTotal: number;
  vat: number;
  sales: ReceiptItem[];
}

interface Props {
  products: Product[];
  customerCards: CustomerCard[];
  onCreateReceipt: (receipt: Receipt) => Promise<void>;
}

export default function NewSale(
  { products, customerCards, onCreateReceipt }: Props,
) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function fetchCurrentEmployee() {
      try {
        const employee = await apiFetch("/api/employees/me");
        setCurrentEmployeeId(employee.idEmployee);
      } catch (err) {
        console.error("Failed to fetch current employee:", err);
      }
    }

    fetchCurrentEmployee();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    p.quantity > 0
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) =>
      item.product.idProduct === product.idProduct
    );

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        alert("Cannot add more items than available in stock");
        return;
      }

      setCart(
        cart.map((item) =>
          item.product.idProduct === product.idProduct
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const product = products.find((p) => p.idProduct === productId);
    if (!product) return;

    if (quantity > product.quantity) {
      alert("Cannot add more items than available in stock");
      return;
    }

    if (quantity <= 0) {
      setCart(cart.filter((item) => item.product.idProduct !== productId));
    } else {
      setCart(
        cart.map((item) =>
          item.product.idProduct === productId ? { ...item, quantity } : item
        ),
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.idProduct !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce(
      (sum, item) => sum + (item.product.sellingPrice * item.quantity),
      0,
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    const sumTotal = calculateTotal();

    const vat = Math.round(sumTotal * 0.2 * 100) / 100;

    const printDate = new Date().toISOString();

    let receiptNumber = "";
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      attempts++;

      const potentialReceiptNumber = `REC${
        Math.floor(100000 + Math.random() * 900000).toString().substring(0, 7)
      }`;

      try {
        await apiFetch(`/api/receipts/search/${potentialReceiptNumber}`);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes("400")) {
            receiptNumber = potentialReceiptNumber;
            isUnique = true;
          } else {
            console.error(
              "Error checking receipt number uniqueness (non-404):",
              err,
            );
            alert(
              `Failed to verify receipt number uniqueness due to an unexpected error. Please try again. Error: ${err.message}`,
            );
            return;
          }
        } else {
          console.error(
            "Unexpected non-Error thrown during receipt check:",
            err,
          );
          alert(
            "An unexpected issue occurred while checking receipt uniqueness.",
          );
          return;
        }
      }
    }

    if (!isUnique) {
      alert(
        "Failed to generate a unique receipt number after multiple attempts. Please try again.",
      );
      return;
    }

    const receipt = {
      receiptNumber: receiptNumber,
      idEmployee: currentEmployeeId,
      cardNumber: selectedCard || null,
      printDate: printDate,
      sumTotal: sumTotal,
      vat: vat,
      sales: cart.map((item) => ({
        receiptNumber: receiptNumber,
        upc: item.product.upc,
        productNumber: item.quantity,
        sellingPrice: item.product.sellingPrice,
      })),
    };

    try {
      await onCreateReceipt(receipt);

      setCart([]);
      setSelectedCard("");
    } catch (err) {
      console.error("Error during onCreateReceipt callback:", err);

      alert("There was an issue saving the receipt.");
    }
  };

  return (
    <div>
      <h1>New Sale</h1>

      <div class="sale-container">
        <div class="products-list">
          <h2>Products</h2>
          <div class="search-bar">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onInput={(e) =>
                setSearchTerm((e.target as HTMLInputElement).value)}
            />
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>UPC</th>
                <th>Price</th>
                <th>Available</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.idProduct}>
                  <td>{product.productName}</td>
                  <td>{product.upc}</td>
                  <td>${product.sellingPrice.toFixed(2)}</td>
                  <td>{product.quantity}</td>
                  <td>
                    <button type="button" onClick={() => addToCart(product)}>
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div class="cart">
          <h2>Cart</h2>

          <div class="customer-card">
            <label>Customer Card:</label>
            <select
              value={selectedCard}
              onChange={(e) =>
                setSelectedCard((e.target as HTMLSelectElement).value)}
            >
              <option value="">No card</option>
              {customerCards.map((card) => (
                <option value={card.cardNumber}>
                  {card.cardNumber} - {card.surname} {card.name}
                </option>
              ))}
            </select>
          </div>

          {cart.length === 0 ? <p>Cart is empty</p> : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.product.idProduct}>
                    <td>{item.product.productName}</td>
                    <td>${item.product.sellingPrice.toFixed(2)}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max={item.product.quantity}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.product.idProduct,
                            parseInt((e.target as HTMLInputElement).value, 10),
                          )}
                        style={{ width: "60px" }}
                      />
                    </td>
                    <td>
                      ${(item.product.sellingPrice * item.quantity).toFixed(2)}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.idProduct)}
                        className="delete-btn"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>
                    <strong>Total:</strong>
                  </td>
                  <td colSpan={2}>
                    <strong>${calculateTotal().toFixed(2)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          <button
            type="submit"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="checkout-btn"
          >
            Complete Sale
          </button>
        </div>
      </div>
    </div>
  );
}
