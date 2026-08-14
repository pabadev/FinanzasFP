"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface ProductOption {
  _id: string;
  name: string;
  price: number;
  type: "physical" | "service";
  stock: number;
}

interface CustomerOption {
  _id: string;
  name: string;
}

interface AccountOption {
  _id: string;
  name: string;
}

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  priceText: string;
  quantity: number;
}

export function PosCheckout({
  entityId,
  products,
  customers,
  accounts,
}: {
  entityId: string;
  products: ProductOption[];
  customers: CustomerOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "card" | "credit"
  >("cash");
  const [customerId, setCustomerId] = useState(customers[0]?._id ?? "");
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const total = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  function addToCart(product: ProductOption) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        if (
          product.type === "physical" &&
          existing.quantity + 1 > product.stock
        ) {
          setError(`Stock insuficiente para ${product.name}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      if (product.type === "physical" && product.stock < 1) {
        setError(`Stock insuficiente para ${product.name}`);
        return prev;
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          unitPrice: product.price,
          priceText: (product.price / 100).toFixed(2),
          quantity: 1,
        },
      ];
    });
    setError("");
  }

  function changeUnitPrice(productId: string, value: string) {
    const parsed = parseFloat(value);
    const cents = Math.round(parsed * 100);
    const valid = Number.isFinite(cents) && cents >= 0;
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              priceText: value,
              unitPrice: valid ? cents : item.unitPrice,
            }
          : item,
      ),
    );
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const next = item.quantity + delta;
          const product = products.find((p) => p._id === productId);
          if (product?.type === "physical" && next > product.stock) {
            setError(`Stock insuficiente para ${item.name}`);
            return item;
          }
          return { ...item, quantity: next };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (cart.length === 0) {
      setError("Añade al menos un producto");
      return;
    }
    if (paymentMethod !== "credit" && !accountId) {
      setError("Selecciona una cuenta para el pago");
      return;
    }
    if (paymentMethod === "credit" && !customerId) {
      setError("Selecciona un cliente para la venta a crédito");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityId,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod,
        accountId: paymentMethod === "credit" ? undefined : accountId,
        customerId: paymentMethod === "credit" ? customerId : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo completar la venta");
      return;
    }

    setCart([]);
    setSuccess(
      `Venta #${data._id} completada por ${(
        (data.total ?? 0) / 100
      ).toLocaleString("es", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    );
    router.refresh();
  }

  return (
    <div className="grid-two">
      <section className="panel">
        <h3>Productos</h3>
        {products.length === 0 ? (
          <p className="small-text">
            Sin productos. Crea productos en Inventario primero.
          </p>
        ) : (
          <ul>
            {products.map((product) => (
              <li key={product._id}>
                <button
                  type="button"
                  className="btn-inline ghost-btn"
                  onClick={() => addToCart(product)}
                >
                  {product.name} — $
                  {(product.price / 100).toLocaleString("es", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  {product.type === "physical"
                    ? ` · stock ${product.stock}`
                    : " · servicio"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h3>Venta actual</h3>
        {cart.length === 0 ? (
          <p className="small-text">Sin productos en la venta.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Cant.</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.priceText}
                      onChange={(e) =>
                        changeUnitPrice(item.productId, e.target.value)
                      }
                      style={{ width: "110px" }}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-inline ghost-btn"
                      onClick={() => changeQuantity(item.productId, -1)}
                    >
                      −
                    </button>
                    {item.quantity}
                    <button
                      type="button"
                      className="btn-inline ghost-btn"
                      onClick={() => changeQuantity(item.productId, 1)}
                    >
                      +
                    </button>
                  </td>
                  <td>
                    $
                    {((item.unitPrice * item.quantity) / 100).toLocaleString(
                      "es",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-inline ghost-btn"
                      onClick={() => removeItem(item.productId)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pos-payment">Medio de pago</label>
              <select
                id="pos-payment"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as
                      | "cash"
                      | "transfer"
                      | "card"
                      | "credit",
                  )
                }
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="credit">Crédito</option>
              </select>
            </div>

            {paymentMethod !== "credit" && (
              <div className="form-group">
                <label htmlFor="pos-account">Cuenta</label>
                <select
                  id="pos-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {paymentMethod === "credit" && (
              <div className="form-group">
                <label htmlFor="pos-customer">Cliente</label>
                <select
                  id="pos-customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Total</label>
            <input
              value={`$${(total / 100).toLocaleString("es", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              readOnly
            />
          </div>

          {error && <p className="small-text error-text">{error}</p>}
          {success && <p className="small-text success-text">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Procesando..." : "Completar venta"}
          </button>
        </form>
      </section>
    </div>
  );
}