"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function EditTransactionForm({
  txId,
  initialAmount,
  initialCategory,
  initialDescription,
  initialDate,
}: {
  txId: string;
  initialAmount: number;
  initialCategory?: string;
  initialDescription?: string;
  initialDate?: Date;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((initialAmount / 100).toFixed(2));
  const [category, setCategory] = useState(initialCategory ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [date, setDate] = useState(
    initialDate ? new Date(initialDate).toISOString().slice(0, 10) : "",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Monto inválido");
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: cents,
        category: category || null,
        description: description || null,
        date: date || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo actualizar");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm("¿Eliminar esta transacción? El saldo se ajustará."))
      return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo eliminar");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt">
      <div className="form-row">
        <button
          type="button"
          className="btn-inline ghost-btn"
          onClick={() => {
            setOpen(!open);
            setError("");
          }}
        >
          Editar
        </button>
        <button
          type="button"
          className="btn-inline ghost-btn"
          onClick={handleDelete}
          disabled={loading}
        >
          Eliminar
        </button>
      </div>

      {open && (
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`edit-amount-${txId}`}>Monto</label>
              <input
                id={`edit-amount-${txId}`}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`edit-category-${txId}`}>Categoría</label>
              <input
                id={`edit-category-${txId}`}
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor={`edit-date-${txId}`}>Fecha</label>
              <input
                id={`edit-date-${txId}`}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor={`edit-desc-${txId}`}>Descripción</label>
            <input
              id={`edit-desc-${txId}`}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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