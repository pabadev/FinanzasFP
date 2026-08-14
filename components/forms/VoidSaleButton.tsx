"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VoidSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVoid() {
    if (
      !window.confirm(
        "¿Anular esta venta? Se repondrá el stock y se revertirá el pago.",
      )
    )
      return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo anular la venta");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        className="btn-inline ghost-btn"
        onClick={handleVoid}
        disabled={loading}
      >
        {loading ? "..." : "Anular"}
      </button>
      {error && <p className="small-text error-text">{error}</p>}
    </div>
  );
}