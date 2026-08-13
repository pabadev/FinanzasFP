import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="hero">
        <span className="eyebrow">SaaS • Finanzas</span>
        <h1>
          Controla tus finanzas personales y tu negocio desde una sola
          plataforma.
        </h1>
        <p>
          Gestiona cuentas, transferencias, ventas, inventario, roles y
          auditoría con una arquitectura ready para multi-tenant.
        </p>
        <div className="hero-actions">
          <Link href="/login" className="primary-btn">
            Iniciar sesión
          </Link>
          <Link href="/register" className="secondary-btn">
            Crear cuenta
          </Link>
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <h3>Personal</h3>
          <p>Monitorea ingresos, gastos, transferencias y saldos por cuenta.</p>
        </article>
        <article>
          <h3>Negocios</h3>
          <p>
            Administra inventario, ventas, clientes y flujo de caja del negocio.
          </p>
        </article>
        <article>
          <h3>Seguridad</h3>
          <p>
            RBAC, auditoría append-only y transacciones atómicas para cada
            operación.
          </p>
        </article>
      </section>
    </main>
  );
}
