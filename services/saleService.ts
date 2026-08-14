import Product from "@/models/Product";
import Sale from "@/models/Sale";
import Customer from "@/models/Customer";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";

interface SaleItemInput {
  productId: string;
  quantity: number;
}

export async function createSale(params: {
  entityId: string;
  items: SaleItemInput[];
  paymentMethod: "cash" | "transfer" | "card" | "credit";
  accountId?: string;
  customerId?: string;
  userId: string;
}) {
  await connectDB();

  await requireEntityMembership(params.userId, params.entityId);

  const saleItems: {
    product: string;
    name: string;
    quantity: number;
    unitPrice: number;
    isService: boolean;
  }[] = [];
  let total = 0;

  for (const item of params.items) {
    const product = await Product.findOne({
      _id: item.productId,
      entity: params.entityId,
    });

    if (!product) throw new Error(`Producto ${item.productId} no existe`);

    if (product.type === "physical") {
      const updated = await Product.findOneAndUpdate(
        {
          _id: product._id,
          entity: params.entityId,
          stock: { $gte: item.quantity },
        },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );

      if (!updated) throw new Error(`Stock insuficiente para ${product.name}`);

      await Product.updateOne(
        { _id: product._id },
        { $push: { stockMovements: { change: -item.quantity, reason: "sale" } } },
      );
    }

    saleItems.push({
      product: product._id.toString(),
      name: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      isService: product.type === "service",
    });

    total += product.price * item.quantity;
  }

  let accountId: string | undefined;

  if (params.paymentMethod !== "credit") {
    if (!params.accountId)
      throw new Error("Cuenta requerida para pago no-crÃ©dito");

    const account = await Account.findOne({
      _id: params.accountId,
      entity: params.entityId,
      isActive: true,
    });

    if (!account) throw new Error("Cuenta no encontrada");

    await Account.findOneAndUpdate(
      { _id: account._id, isActive: true },
      { $inc: { balance: total } },
      { new: true },
    );

    accountId = account._id.toString();
  }

const [sale] = await Sale.create([
    {
      entity: params.entityId,
      items: saleItems,
      total,
      paidAmount:
        params.paymentMethod === "credit" ? 0 : total,
      paymentMethod: params.paymentMethod,
      account: accountId,
      customer: params.customerId,
      status: params.paymentMethod === "credit" ? "pending" : "paid",
      soldBy: params.userId,
    },
  ]);

  if (params.paymentMethod === "credit" && params.customerId) {
    await Customer.findByIdAndUpdate(params.customerId, {
      $inc: { debt: total },
    });
  }

  if (accountId) {
    await Transaction.create({
      entity: params.entityId,
      account: accountId,
      type: "sale_payment",
      amount: total,
      currency: "USD",
      description: `Venta #${sale._id}`,
      category: "venta",
      createdBy: params.userId,
    });
  }

  return sale;
}

export async function registerSalePayment(params: {
  saleId: string;
  accountId: string;
  amount: number;
  userId: string;
}) {
  await connectDB();

  const sale = await Sale.findById(params.saleId);
  if (!sale) throw new Error("Venta no encontrada");

  const entityId = sale.entity.toString();
  await requireEntityMembership(params.userId, entityId);

  if (sale.status === "paid") throw new Error("La venta ya está pagada");

  if (params.amount <= 0) throw new Error("El monto debe ser positivo");

  const paidSoFar = sale.paidAmount ?? 0;
  const remaining = sale.total - paidSoFar;
  if (params.amount > remaining)
    throw new Error("El abono excede el saldo pendiente");

  const account = await Account.findOne({
    _id: params.accountId,
    entity: entityId,
    isActive: true,
  });
  if (!account) throw new Error("Cuenta no encontrada");

  await Account.findOneAndUpdate(
    { _id: account._id, isActive: true },
    { $inc: { balance: params.amount } },
  );

  const newPaid = paidSoFar + params.amount;
  const newStatus = newPaid >= sale.total ? "paid" : "partial";

  await Sale.findByIdAndUpdate(params.saleId, {
    paidAmount: newPaid,
    status: newStatus,
  });

  if (sale.customer) {
    await Customer.findByIdAndUpdate(sale.customer, {
      $inc: { debt: -params.amount },
    });
  }

  await Transaction.create({
    entity: entityId,
    account: account._id.toString(),
    type: "income",
    amount: params.amount,
    currency: account.currency,
    description: `Abono venta #${sale._id}`,
    category: "venta",
    createdBy: params.userId,
  });

  return Sale.findById(params.saleId);
}

