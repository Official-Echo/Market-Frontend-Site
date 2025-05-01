import { useEffect, useState } from "preact/hooks";
import { Product } from "../../routes/products.tsx";

interface Category {
  categoryNumber: number;
  categoryName: string;
}

interface Props {
  categories: Category[];
  product?: Product;
  products: Product[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function ProductForm(
  { categories, product, products, onSave, onCancel }: Props,
) {
  const [formData, setFormData] = useState({
    productName: product?.productName || "",
    categoryId: product?.categoryNumber || categories[0]?.categoryNumber || 0,
    characteristics: product?.characteristics || "",
    manufacturer: product?.manufacturer || "",
    upc: product?.upc || "",
    upcProm: "",
    sellingPrice: product?.sellingPrice || 0,
    productsNumber: product?.quantity || 0,
    promotionalProduct: product?.isPromotional || false,
    idProduct: product?.idProduct || null as string | number | null,
  });

  useEffect(() => {
    if (!product && products) {
      const upcNumericParts = products
        .map((p) => {
          const match = p.upc?.match(/^UPC(\d+)$/);
          return match ? parseInt(match[1], 10) : -1;
        })
        .filter((num) => num >= 0);
      const highestUpcNum = upcNumericParts.length > 0
        ? Math.max(...upcNumericParts)
        : -1;
      const upcPaddingLength = 3;
      const nextUpcNum = highestUpcNum + 1;
      const nextUpc = `UPC${
        nextUpcNum.toString().padStart(upcPaddingLength, "0")
      }`;
      const nextPromNum = nextUpcNum + 1;
      const nextUpcProm = `UPC${
        nextPromNum.toString().padStart(upcPaddingLength, "0")
      }`;

      const idProductNumericParts = products
        .map((p) =>
          typeof p.idProduct === "string"
            ? parseInt(p.idProduct, 10)
            : p.idProduct
        )
        .filter((id): id is number => typeof id === "number" && !isNaN(id));

      const highestIdProduct = idProductNumericParts.length > 0
        ? Math.max(...idProductNumericParts)
        : 0;

      const nextIdProduct = highestIdProduct + 1;

      setFormData((prevData) => ({
        ...prevData,
        upc: nextUpc,
        upcProm: nextUpcProm,
        idProduct: String(nextIdProduct),
      }));
    }
  }, [product, products]);

  const handleInputChange = (e: Event) => {
    const target = e.target as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    const value = target.type === "checkbox"
      ? (target as HTMLInputElement).checked
      : target.type === "number"
      ? Number(target.value)
      : target.value;

    if (target.name === "categoryId") {
      setFormData({
        ...formData,
        [target.name]: Number(value),
      });
    } else {
      setFormData({
        ...formData,
        [target.name]: value,
      });
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const saveData = {
      product: {
        idProduct: formData.idProduct,
        productName: formData.productName,
        categoryNumber: formData.categoryId,
        characteristics: formData.characteristics,
        manufacturer: formData.manufacturer,
      },
      storeProduct: {
        upc: formData.upc,
        upcProm: formData.upcProm,
        idProduct: formData.idProduct,
        sellingPrice: formData.sellingPrice,
        productsNumber: formData.productsNumber,
        promotionalProduct: formData.promotionalProduct,
      },
    };
    onSave(saveData);
  };

  return (
    <div className="form-container">
      <h2>{product ? "Edit Product" : "Add New Product"}</h2>
      <form onSubmit={handleSubmit}>
        <h3>Core Product Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Product Name:</label>
            <input
              type="text"
              name="productName"
              required
              value={formData.productName}
              onInput={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Manufacturer:</label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onInput={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Category:</label>
            <select
              name="categoryId"
              required
              value={formData.categoryId}
              onChange={handleInputChange}
            >
              {categories.map((cat) => (
                <option key={cat.categoryNumber} value={cat.categoryNumber}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Characteristics:</label>
          <textarea
            name="characteristics"
            value={formData.characteristics}
            onInput={handleInputChange}
            rows={3}
          />
        </div>

        <hr style={{ margin: "20px 0" }} />

        <h3>Store Inventory Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label>UPC:</label>
            <input
              type="text"
              name="upc"
              value={formData.upc}
              readOnly
              style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
            />
            <small
              style={{ display: "block", marginTop: "5px", color: "#666" }}
            >
              {product
                ? "UPC cannot be changed"
                : "UPC automatically generated for new products"}
            </small>
          </div>
          <div className="form-group">
            <label>Selling Price:</label>
            <input
              type="number"
              name="sellingPrice"
              required
              min="0"
              step="0.01"
              value={formData.sellingPrice}
              onInput={handleInputChange}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Quantity in Stock:</label>
            <input
              type="number"
              name="productsNumber"
              required
              min="0"
              value={formData.productsNumber}
              onInput={handleInputChange}
            />
          </div>
          <div
            className="form-group"
            style={{ display: "flex", alignItems: "center" }}
          >
            <label style={{ marginRight: "10px" }}>Promotional Product:</label>
            <input
              type="checkbox"
              name="promotionalProduct"
              checked={formData.promotionalProduct}
              onChange={handleInputChange}
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        </div>

        <div className="form-buttons">
          <button type="submit">{product ? "Update" : "Add"}</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
