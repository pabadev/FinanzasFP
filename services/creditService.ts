import Credit from "@/models/Credit";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const PERIODS_PER_YEAR: Record<string, number> = {
  monthly: 12,
  biweekly: 24,
  weekly: 52,
};

function addPeriod(date: Date, frequency: string, index: number): Date {
  const d = new Date(date);
  if (frequency === "monthly") {
    d.setMonth(d.getMonth() + index);
  } else if (frequency === "biweekly") {
    d.setDate(d.getDate() + index * 14);
  } else {
    d.setDate(d.getDate() + index * 7);
  }
  return d;
}

function buildInstallments(params: {
  amount: number;
  rate: number;
  term: number;
  frequency: "monthly" | "biweekly" | "weekly";
  amortization: "french" | "american";
  startDate: Date;
}) {
  const periodsPerYear = PERIODS_PER_YEAR[params.frequency];
  const periodRate = params.rate / 100 / periodsPerYear;

  const installments: {
    number: number;
    dueDate: Date;
    principal: number;
    interest: number;
    total: number;
  }[] = [];

  let remaining = params.amount;

  let fixedPayment = 0;
  if (params.amortization === "french") {
    if (periodRate > 0) {
      fixedPayment =
        (params.amount * periodRate) /
        (1 - Math.pow(1 + periodRate, -params.term));
    } else {
      fixedPayment = params.amount / params.term;
    }
  }

  for (let i = 1; i <= params.term; i++) {
    const interest = Math.round(remaining * periodRate);
    let principal: number;

    if (params.amortization === "american") {
      principal = i === params.term ? remaining : 0;
    } else {
      principal =
        i === params.term ? remaining : Math.round(fixedPayment) - interest;
    }

    if (principal > remaining) principal = remaining;
    if (principal < 0) principal = 0;

    installments.push({
      number: i,
      dueDate: addPeriod(params.startDate, params.frequency, i),
      principal,
      interest,
      total: principal + interest,
    });

    remaining -= principal;
  }

  return installments;
}

export async function createCredit(params: {
  entity: string;
  lender: string;
  direction: "incoming" | "outgoing";
  amount: number;
  currency: string;
  rate: number;
  term: number;
  frequency: "monthly" | "biweekly" | "weekly";
  amortization: "french" | "american";
  startDate?: Date;
  accountId: string;
  userId: string;
}) {
  await connectDB();
  await requireRole(
    params.userId,
    ["owner", "admin", "accountant"],
    params.entity,
  );

  const account = await Account.findOne({
    _id: params.accountId,
    entity: params.entity,
    isActive: true,
  });
  if (!account) throw new Error("Cuenta no encontrada");

  const installments = buildInstallments({
    amount: params.amount,
    rate: params.rate,
    term: params.term,
    frequency: params.frequency,
    amortization: params.amortization,
    startDate: params.startDate ?? new Date(),
  });

  if (params.direction === "incoming") {
    await Account.findOneAndUpdate(
      { _id: account._id, isActive: true },
      { $inc: { balance: params.amount } },
    );
    await Transaction.create({
      entity: params.entity,
      account: account._id.toString(),
      type: "income",
      amount: params.amount,
      currency: params.currency,
      description: `Desembolso crédito - ${params.lender}`,
      category: "préstamo",
      createdBy: params.userId,
    });
  } else {
    const updated = await Account.findOneAndUpdate(
      {
        _id: account._id,
        isActive: true,
        balance: { $gte: params.amount },
      },
      { $inc: { balance: -params.amount } },
      { new: true },
    );
    if (!updated) throw new Error("Fondos insuficientes");
    await Transaction.create({
      entity: params.entity,
      account: account._id.toString(),
      type: "expense",
      amount: params.amount,
      currency: params.currency,
      description: `Crédito otorgado - ${params.lender}`,
      category: "préstamo",
      createdBy: params.userId,
    });
  }

  const [credit] = await Credit.create([
    {
      entity: params.entity,
      lender: params.lender,
      direction: params.direction,
      amount: params.amount,
      currency: params.currency,
      rate: params.rate,
      term: params.term,
      frequency: params.frequency,
      amortization: params.amortization,
      startDate: params.startDate,
      account: params.accountId,
      installments,
      createdBy: params.userId,
    },
  ]);

  return credit;
}

export async function payInstallment(params: {
  creditId: string;
  installmentNumber: number;
  accountId: string;
  userId: string;
}) {
  await connectDB();

  const credit = await Credit.findById(params.creditId);
  if (!credit) throw new Error("Crédito no encontrado");

  const entityId = credit.entity.toString();
  await requireRole(
    params.userId,
    ["owner", "admin", "accountant"],
    entityId,
  );

  if (credit.status !== "active") throw new Error("El crédito no está activo");

  const installment = credit.installments.find(
    (inst: { number: number }) => inst.number === params.installmentNumber,
  );
  if (!installment) throw new Error("Cuota no encontrada");
  if (installment.paid) throw new Error("La cuota ya está pagada");

  const account = await Account.findOne({
    _id: params.accountId,
    entity: entityId,
    isActive: true,
  });
  if (!account) throw new Error("Cuenta no encontrada");

  if (credit.direction === "incoming") {
    const updated = await Account.findOneAndUpdate(
      {
        _id: account._id,
        isActive: true,
        balance: { $gte: installment.total },
      },
      { $inc: { balance: -installment.total } },
      { new: true },
    );
    if (!updated) throw new Error("Fondos insuficientes");
  } else {
    await Account.findOneAndUpdate(
      { _id: account._id, isActive: true },
      { $inc: { balance: installment.total } },
    );
  }

  const [tx] = await Transaction.create([
    {
      entity: entityId,
      account: account._id.toString(),
      type: credit.direction === "incoming" ? "expense" : "income",
      amount: installment.total,
      currency: credit.currency,
      description: `Cuota ${installment.number} de ${credit.lender}`,
      category: "préstamo",
      createdBy: params.userId,
    },
  ]);

  await Credit.updateOne(
    { _id: credit._id, "installments.number": params.installmentNumber },
    {
      $set: {
        "installments.$.paid": true,
        "installments.$.paidDate": new Date(),
        "installments.$.transaction": tx._id,
      },
    },
  );

  const paidCount =
    credit.installments.filter((inst: { paid: boolean }) => inst.paid).length +
    1;

  if (paidCount >= credit.term) {
    await Credit.findByIdAndUpdate(credit._id, { status: "paid" });
  }

  return Credit.findById(credit._id);
}