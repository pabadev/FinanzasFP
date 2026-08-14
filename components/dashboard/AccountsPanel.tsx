import { EditAccountForm } from "@/components/forms/EditAccountForm";
import { CreateAccountForm } from "@/components/forms/CreateAccountForm";
import { formatMoney } from "@/lib/money";

export interface AccountRow {
  _id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  creditLimit: number;
  isActive: boolean;
}

export function AccountsPanel({
  entityId,
  accounts,
  currency,
}: {
  entityId: string;
  accounts: AccountRow[];
  currency: string;
}) {
  return (
    <section className="panel">
      <h3>Cuentas</h3>
      {accounts.length === 0 ? (
        <p className="small-text">Sin cuentas todavía.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Tipo</th>
              <th>Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account._id}>
                <td>{account.name}</td>
                <td>{account.type}</td>
                <td>{formatMoney(account.balance, currency)}</td>
                <td>
                  <EditAccountForm
                    accountId={account._id}
                    initialName={account.name}
                    initialType={account.type}
                    initialCurrency={account.currency}
                    initialCreditLimit={account.creditLimit}
                    initialIsActive={account.isActive}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <CreateAccountForm entityId={entityId} />
    </section>
  );
}