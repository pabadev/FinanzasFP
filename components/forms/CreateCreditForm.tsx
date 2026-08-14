"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface AccountOption {
  _id: string;
  name: string;
}

export function CreateCreditForm({
  entityId,
  accounts,
}: {
  entityId: string;
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lender, setLender] = useState("");
  const [direction, setDirection] = useState<"incoming" | "outgoing">(
    "incoming",
  );
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState("");
  const [frequency, setFrequency] = useState<
    "monthly" | "biweekly" | "weekly"
  >("monthly");
  const [amortization, setAmortization] = useState<"french" | "american">(
    "french",
  );
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Monto inválido");
      setLoading(false);
      return;
    }

    const termNumber = parseInt(term, 10);
    if (!Number.isFinite(termNumber) || termNumber <= 0) {
      setError("Plazo inválido");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: entityId,
        lender,
        direction,
        amount: amountCents,
        rate: rate ? parseFloat(rate) : 0,
        term: termNumber,
        frequency,
        amortization,
        accountId,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo crear el crédito");
      return;
    }

    setLender("");
    setAmount("");
    setRate("");
    setTerm("");
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
          Registrar crédito
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="credit-lender">Prestador</label>
              <input
                id="credit-lender"
                type="text"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="credit-direction">Dirección</label>
              <select
                id="credit-direction"
                value={direction}
                onChange={(e) =>
                  setDirection(e.target.value as "incoming" | "outgoing")
                }
              >
                <option value="incoming">Recibido (te prestan)</option>
                <option value="outgoing">Otorgado (tú prestas)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="credit-amount">Monto</label>
              <input
                id="credit-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="credit-rate">Tasa anual %</label>
              <input
                id="credit-rate"
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="credit-term">Nº de cuotas</label>
              <input
                id="credit-term"
                type="number"
                min="1"
                step="1"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="credit-frequency">Frecuencia</label>
              <select
                id="credit-frequency"
                value={frequency}
                onChange={(e) =>
                  setFrequency(
                    e.target.value as "monthly" | "biweekly" | "weekly",
                  )
                }
              >
                <option value="monthly">Mensual</option>
                <option value="biweekly">Quincenal</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="credit-amortization">Amortización</label>
              <select
                id="credit-amortization"
                value={amortization}
                onChange={(e) =>
                  setAmortization(e.target.value as "french" | "american")
                }
              >
                <option value="french">Francesa</option>
                <option value="american">Americana</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="credit-account">Cuenta</label>
              <select
                id="credit-account"
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