"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface PendingSale {
  _id: string;
  total: number;
  paidAmount: number;
  customerName: string;
}

interface AccountOption {
  _id: string;
  name: string;
}

export function SalePaymentForm({
  pendingSales,
  accounts,
}: {
  pendingSales: PendingSale[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saleId, setSaleId] = useState(pendingSales[0]?._id ?? "");
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = pendingSales.find((sale) => sale._id === saleId);
  const remaining = selected ? selected.total - (selected.paidAmount ?? 0) : 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Monto inválido");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/sales/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleId,
        accountId,
        amount: cents,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo registrar el abono");
      return;
    }

    setAmount("");
    setSuccess(
      `Abono registrado. Saldo pendiente: $${(
        ((data.total ?? 0) - (data.paidAmount ?? 0)) /
        100
      ).toLocaleString("es", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    );
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
          Registrar abono
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="payment-sale">Venta pendiente</label>
              <select
                id="payment-sale"
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
                required
              >
                {pendingSales.map((sale) => (
                  <option key={sale._id} value={sale._id}>
                    {sale.customerName} · #{sale._id.slice(-6)} — pendiente $
                    {((sale.total - (sale.paidAmount ?? 0)) / 100).toLocaleString(
                      "es",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="payment-account">Cuenta</label>
              <select
                id="payment-account"
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

            <div className="form-group">
              <label htmlFor="payment-amount">Abono</label>
              <input
                id="payment-amount"
                type="number"
                min="0.01"
                max={(remaining / 100).toFixed(2)}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="small-text error-text">{error}</p>}
          {success && <p className="small-text success-text">{success}</p>}

          <div className="form-row">
            <button type="submit" className="btn-inline" disabled={loading}>
              {loading ? "Guardando..." : "Guardar abono"}
            </button>
            <button
              type="button"
              className="btn-inline ghost-btn"
              onClick={() => {
                setOpen(false);
                setError("");
                setSuccess("");
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