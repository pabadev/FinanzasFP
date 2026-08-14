import Customer from "@/models/Customer";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";

export async function createCustomer(params: {
  entity: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  userId: string;
}) {
  await connectDB();
  await requireEntityMembership(params.userId, params.entity);

  return Customer.create({
    entity: params.entity,
    name: params.name,
    contact: params.contact,
    phone: params.phone,
    email: params.email,
  });
}