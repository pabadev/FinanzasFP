"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCategoryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo crear la categoría");
      return;
    }

    setName("");
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
          Nueva categoría
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category-name">Nombre</label>
              <input
                id="category-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category-type">Tipo</label>
              <select
                id="category-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "income" | "expense")
                }
              >
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
              </select>
            </div>
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