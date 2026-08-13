"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PersonalOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createEntity() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Mis finanzas",
        type: "personal",
        baseCurrency: "USD",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo crear la entidad");
      return;
    }

    router.refresh();
  }

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <h2>Dashboard personal</h2>
      </header>
      <section className="panel">
        <h3>Bienvenido</h3>
        <p>
          No tienes una entidad personal. Crea tu espacio de finanzas
          personales para empezar a registrar cuentas y movimientos.
        </p>
        <button
          type="button"
          className="btn-inline"
          onClick={createEntity}
          disabled={loading}
        >
          {loading ? "Creando..." : "Crear mi entidad personal"}
        </button>
        {error && <p className="small-text error-text">{error}</p>}
      </section>
    </div>
  );
}
