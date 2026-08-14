import { CreateCreditForm } from "@/components/forms/CreateCreditForm";
import { PayInstallmentForm } from "@/components/forms/PayInstallmentForm";
import { formatMoney } from "@/lib/money";

interface CreditAccount {
  _id: string;
  name: string;
}

export function CreditsPanel({
  entityId,
  credits,
  accounts,
  currency,
}: {
  entityId: string;
  credits: {
    _id: { toString(): string };
    lender: string;
    direction: string;
    amount: number;
    rate: number;
    term: number;
    status: string;
    currency: string;
    installments: {
      number: number;
      total: number;
      dueDate: Date;
      paid: boolean;
    }[];
  }[];
  accounts: CreditAccount[];
  currency: string;
}) {
  const accountsForForm = accounts.map((account) => ({
    _id: account._id.toString(),
    name: account.name,
  }));

  const activeCredits = credits.filter((credit) => credit.status === "active");

  const creditsForForm = activeCredits.map((credit) => ({
    _id: credit._id.toString(),
    lender: credit.lender,
    installments: (credit.installments ?? []).map((installment) => ({
      number: installment.number,
      total: installment.total,
      dueDate: installment.dueDate.toISOString(),
      paid: installment.paid,
    })),
  }));

  return (
    <section className="panel">
      <h3>Créditos y préstamos</h3>
      {credits.length === 0 ? (
        <p className="small-text">Sin créditos todavía.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Prestador</th>
              <th>Dirección</th>
              <th>Monto</th>
              <th>Tasa</th>
              <th>Cuotas</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {credits.map((credit) => {
              const paidCount = (credit.installments ?? []).filter(
                (installment) => installment.paid,
              ).length;
              const next = (credit.installments ?? []).find(
                (installment) => !installment.paid,
              );
              return (
                <tr key={credit._id.toString()}>
                  <td>{credit.lender}</td>
                  <td>
                    {credit.direction === "incoming"
                      ? "Recibido"
                      : "Otorgado"}
                  </td>
                  <td>
                    {formatMoney(credit.amount, credit.currency || currency)}
                  </td>
                  <td>{credit.rate}%</td>
                  <td>
                    {paidCount}/{credit.term}
                    {next ? (
                      <div className="small-text">
                        Próxima: cuota {next.number} ·{" "}
                        {formatMoney(next.total, credit.currency || currency)}{" "}
                        ·{" "}
                        {new Date(next.dueDate).toLocaleDateString("es")}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {credit.status === "paid" ? (
                      <span className="success-text">Pagado</span>
                    ) : credit.status === "cancelled" ? (
                      <span className="small-text">Cancelado</span>
                    ) : (
                      <span className="error-text">Activo</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <CreateCreditForm entityId={entityId} accounts={accountsForForm} />
      {creditsForForm.length > 0 && (
        <PayInstallmentForm
          credits={creditsForForm}
          accounts={accountsForForm}
        />
      )}
    </section>
  );
}