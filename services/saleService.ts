import mongoose from "mongoose";

import Product from "@/models/Product";
import Sale from "@/models/Sale";
import Account from "@/models/Account";
import { connectDB } from "@/lib/db";

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
  const session = await mongoose.startSession();

  try {
    let sale;

    await session.withTransaction(async () => {
      const saleItems: any[] = [];
      let total = 0;

      for (const item of params.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw new Error(`Producto ${item.productId} no existe`);

        if (product.type === "physical") {
          if (product.stock < item.quantity) {
            throw new Error(`Stock insuficiente para ${product.name}`);
          }

          product.stock -= item.quantity;
          product.stockMovements.push({
            change: -item.quantity,
            reason: "sale",
          });
          await product.save({ session });
        }

        saleItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          isService: product.type === "service",
        });

        total += product.price * item.quantity;
      }

      if (params.paymentMethod !== "credit") {
        if (!params.accountId)
          throw new Error("Cuenta requerida para pago no-crédito");

        const account = await Account.findById(params.accountId).session(
          session,
        );
        if (!account) throw new Error("Cuenta no encontrada");

        account.balance += total;
        await account.save({ session });
      }

      const [createdSale] = await Sale.create(
        [
          {
            entity: params.entityId,
            items: saleItems,
            total,
            paymentMethod: params.paymentMethod,
            account:
              params.paymentMethod !== "credit" ? params.accountId : undefined,
            customer: params.customerId,
            status: params.paymentMethod === "credit" ? "pending" : "paid",
            soldBy: params.userId,
          },
        ],
        { session },
      );

      sale = createdSale;
    });

    return sale;
  } finally {
    session.endSession();
  }
}
