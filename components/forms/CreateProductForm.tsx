"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProductForm({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [type, setType] = useState<"physical" | "service">("physical");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const priceCents = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError("Precio inválido");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: entityId,
        name,
        sku,
        type,
        price: priceCents,
        cost: cost ? Math.round(parseFloat(cost) * 100) : undefined,
        stock: type === "physical" && stock ? parseInt(stock, 10) : undefined,
        minStock:
          type === "physical" && minStock ? parseInt(minStock, 10) : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo crear el producto");
      return;
    }

    setName("");
    setSku("");
    setPrice("");
    setCost("");
    setStock("");
    setMinStock("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt">
      {!open ? (
        <button
          type="button"
          className="btn-inline"
          onClick={() => setOpen(true)}
        >
          Nuevo producto
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="product-name">Nombre</label>
              <input
                id="product-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-sku">SKU</label>
              <input
                id="product-sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-type">Tipo</label>
              <select
                id="product-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "physical" | "service")
                }
              >
                <option value="physical">Físico</option>
                <option value="service">Servicio</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="product-price">Precio</label>
              <input
                id="product-price"
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-cost">Costo</label>
              <input
                id="product-cost"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>

            {type === "physical" && (
              <>
                <div className="form-group">
                  <label htmlFor="product-stock">Stock</label>
                  <input
                    id="product-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-minstock">Stock mínimo</label>
                  <input
                    id="product-minstock"
                    type="number"
                    min="0"
                    step="1"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {error && <p className="small-text error-text">{error}</p>}

          <div className="form-row">
            <button type="submit" className="btn-inline" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="btn-inline ghost-btn"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}