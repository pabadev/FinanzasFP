"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const CURRENCIES = ["USD", "EUR", "MXN", "COP", "GTQ"];

export function ExchangeRateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [rate, setRate] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const rateValue = parseFloat(rate);
    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      setError("Tipo de cambio inválido");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/exchange-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        rate: rateValue,
        source: source || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo guardar el tipo de cambio");
      return;
    }

    setRate("");
    setSource("");
    setSuccess(
      `Tipo de cambio ${data.from} → ${data.to} = ${data.rate} guardado`,
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
          Añadir tipo de cambio
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fx-from">De</label>
              <select
                id="fx-from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fx-to">A</label>
              <select
                id="fx-to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fx-rate">Tasa</label>
              <input
                id="fx-rate"
                type="number"
                min="0.0001"
                step="0.0001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="fx-source">Fuente</label>
              <input
                id="fx-source"
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="small-text error-text">{error}</p>}
          {success && <p className="small-text success-text">{success}</p>}

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