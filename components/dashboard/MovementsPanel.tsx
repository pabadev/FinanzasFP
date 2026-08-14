import { EditTransactionForm } from "@/components/forms/EditTransactionForm";
import { CreateTransactionForm } from "@/components/forms/CreateTransactionForm";
import { formatMoney } from "@/lib/money";

export interface MovementRow {
  _id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

export interface FormAccount {
  _id: string;
  name: string;
}

export interface FormCategory {
  name: string;
  type: string;
}

export function MovementsPanel({
  entityId,
  transactions,
  categories,
  accounts,
  currency,
}: {
  entityId: string;
  transactions: MovementRow[];
  categories: FormCategory[];
  accounts: FormAccount[];
  currency: string;
}) {
  return (
    <section className="panel">
      <h3>Movimientos recientes</h3>
      {transactions.length === 0 ? (
        <p className="small-text">Sin movimientos todavía.</p>
      ) : (
        <ul>
          {transactions.map((item) => {
            const amount =
              item.type === "expense" || item.type === "transfer_out"
                ? -item.amount
                : item.amount;
            return (
              <li key={item._id}>
                <strong>{item.description || item.type}</strong>{" "}
                <span className={amount >= 0 ? "success-text" : "error-text"}>
                  {amount >= 0 ? "+" : "-"}
                  {formatMoney(Math.abs(amount), currency)}
                </span>
                <div className="small-text">
                  {item.category ? `${item.category} · ` : ""}
                  {new Date(item.date).toLocaleDateString("es")}
                </div>
                {(item.type === "income" || item.type === "expense") && (
                  <EditTransactionForm
                    txId={item._id}
                    initialAmount={item.amount}
                    initialCategory={item.category}
                    initialDescription={item.description}
                    initialDate={new Date(item.date)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <CreateTransactionForm
        entityId={entityId}
        accounts={accounts}
        categories={categories}
      />
    </section>
  );
}