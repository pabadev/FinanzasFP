"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface CreditOption {
  _id: string;
  lender: string;
  installments: {
    number: number;
    total: number;
    dueDate: string;
    paid: boolean;
  }[];
}

interface AccountOption {
  _id: string;
  name: string;
}

export function PayInstallmentForm({
  credits,
  accounts,
}: {
  credits: CreditOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creditId, setCreditId] = useState(credits[0]?._id ?? "");
  const [installmentNumber, setInstallmentNumber] = useState<number | "">("");
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = credits.find((credit) => credit._id === creditId);
  const unpaid = (selected?.installments ?? []).filter(
    (installment) => !installment.paid,
  );

  function handleCreditChange(next: string) {
    setCreditId(next);
    setInstallmentNumber("");
    const credit = credits.find((c) => c._id === next);
    const firstUnpaid = credit?.installments.find((i) => !i.paid);
    if (firstUnpaid) setInstallmentNumber(firstUnpaid.number);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/credits/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creditId,
        installmentNumber: Number(installmentNumber),
        accountId,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo registrar la cuota");
      return;
    }

    setSuccess(
      `Cuota ${installmentNumber} de ${data.lender} registrada.`,
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
          Pagar cuota
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pay-credit">Crédito</label>
              <select
                id="pay-credit"
                value={creditId}
                onChange={(e) => handleCreditChange(e.target.value)}
                required
              >
                {credits.map((credit) => (
                  <option key={credit._id} value={credit._id}>
                    {credit.lender}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="pay-installment">Cuota</label>
              <select
                id="pay-installment"
                value={installmentNumber}
                onChange={(e) =>
                  setInstallmentNumber(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                required
              >
                {unpaid.length === 0 ? (
                  <option value="">Sin cuotas pendientes</option>
                ) : (
                  unpaid.map((installment) => (
                    <option
                      key={installment.number}
                      value={installment.number}
                    >
                      Cuota {installment.number} — $
                      {(installment.total / 100).toLocaleString("es", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      · vence{" "}
                      {new Date(installment.dueDate).toLocaleDateString("es")}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="pay-account">Cuenta</label>
              <select
                id="pay-account"
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
          {success && <p className="small-text success-text">{success}</p>}

          <div className="form-row">
            <button
              type="submit"
              className="btn-inline"
              disabled={loading || unpaid.length === 0}
            >
              {loading ? "Guardando..." : "Registrar pago"}
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