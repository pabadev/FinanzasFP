import Link from "next/link";
import { MetricCard } from "@/components/dashboard/MetricCard";

const accounts = [
  { name: "Cuenta principal", balance: "$4,250.00", type: "bank" },
  { name: "Efectivo", balance: "$1,180.00", type: "cash" },
  { name: "Tarjeta", balance: "$820.00", type: "credit_card" },
];

const recent = [
  { description: "Salario", amount: "+$2,800.00", date: "Hoy" },
  { description: "Renta", amount: "-$1,350.00", date: "Ayer" },
  { description: "Supermercado", amount: "-$420.00", date: "Martes" },
];

export default function PersonalDashboardPage() {
  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h2>Dashboard personal</h2>
        </div>
        <nav>
          <Link href="/personal">Personal</Link>
          <Link href="/business/1">Negocio</Link>
          <Link href="/login">Salir</Link>
        </nav>
      </header>

      <div className="summary-grid">
        <MetricCard label="Ingresos" value="$8,420" detail="Este mes" />
        <MetricCard label="Gastos" value="$4,780" detail="Este mes" />
        <MetricCard label="Saldo" value="$13,600" detail="Total consolidado" />
        <MetricCard
          label="Transferencias"
          value="17"
          detail="Últimos 30 días"
        />
      </div>

      <div className="grid-two">
        <section className="panel">
          <h3>Cuentas</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Tipo</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.name}>
                  <td>{account.name}</td>
                  <td>{account.type}</td>
                  <td>{account.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h3>Actividad reciente</h3>
          <ul>
            {recent.map((item) => (
              <li key={item.description}>
                <strong>{item.description}</strong> <span>{item.amount}</span>
                <div className="small-text">{item.date}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
