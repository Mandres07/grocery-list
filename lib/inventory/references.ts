import type { ClientSession, Types } from "mongoose";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { AccountError } from "@/lib/auth/validation";

// Call after verifying membership; keep reference reads in the mutation's session.
export async function requireCategoryInHousehold(householdId: Types.ObjectId, categoryId: Types.ObjectId, session: ClientSession | null = null) {
  const category = await Category.findOne({ _id: categoryId, householdId }).session(session).lean();
  if (!category) throw new AccountError("La categoría no pertenece a este hogar.");
  return category;
}

export async function requireProductInHousehold(householdId: Types.ObjectId, productId: Types.ObjectId, session: ClientSession | null = null) {
  const product = await Product.findOne({ _id: productId, householdId }).session(session).lean();
  if (!product) throw new AccountError("El producto no pertenece a este hogar.");
  return product;
}

// Prevent self-parenting, cycles, and references to categories in another household.
export async function validateCategoryParent(householdId: Types.ObjectId, categoryId: Types.ObjectId, parentId: Types.ObjectId | null, session: ClientSession | null = null) {
  const seen = new Set([categoryId.toHexString()]);
  let ancestorId = parentId;

  while (ancestorId) {
    const key = ancestorId.toHexString();
    if (seen.has(key)) throw new AccountError("Una categoría no puede formar un ciclo.");
    if (seen.size > 100) throw new AccountError("La categoría tiene demasiados niveles.");
    seen.add(key);
    const ancestor = await requireCategoryInHousehold(householdId, ancestorId, session);
    ancestorId = ancestor.parentId;
  }
}
