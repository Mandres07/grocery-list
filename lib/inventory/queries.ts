import { AccountError } from "@/lib/auth/validation";
import { requireHouseholdAccess, requireObjectId } from "@/lib/households/access";
import type { HouseholdActor } from "@/lib/households/mutation-access";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Category from "@/models/Category";
import StockMovement from "@/models/StockMovement";
import { descendantCategoryIds, type InventoryCategory } from "./categories";

async function requireInventoryReadAccess(actor: HouseholdActor, householdId: string) {
  await connectToDatabase();
  if (!await User.exists({ _id: requireObjectId(actor.id), sessionVersion: actor.sessionVersion, emailVerifiedAt: { $ne: null } })) {
    throw new AccountError("Inicia sesión de nuevo y verifica tu correo para continuar.");
  }
  return requireHouseholdAccess(actor.id, householdId);
}

export async function listInventory(actor: HouseholdActor, householdId: string, filters: { query?: string; categoryId?: string; lowStock?: boolean; archived?: boolean } = {}) {
  const access = await requireInventoryReadAccess(actor, householdId);
  const categories = await readCategories(householdId);
  const query = filters.query?.trim().slice(0, 160) ?? "";
  const categoryId = filters.categoryId;
  if (categoryId && !categories.some((category) => category.id === categoryId)) throw new AccountError("La categoría no pertenece a este hogar.");
  const filter = {
    householdId: access.householdId,
    archivedAt: filters.archived ? { $ne: null } : null,
    ...(query ? { name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {}),
    ...(categoryId ? { categoryId: { $in: descendantCategoryIds(categories, categoryId).map(requireObjectId) } } : {}),
    ...(filters.lowStock ? { lowStockThreshold: { $ne: null }, $expr: { $lte: ["$quantity", "$lowStockThreshold"] } } : {}),
  };
  const [products, total] = await Promise.all([Product.find(filter).sort({ name: 1, _id: 1 }).limit(100).lean(), Product.countDocuments(filter)]);
  return { categories, total, products: products.map((product) => ({
    id: product._id.toString(), name: product.name, unit: product.unit, quantity: product.quantity,
    categoryId: product.categoryId?.toString() ?? null, lowStockThreshold: product.lowStockThreshold,
    revision: product.revision ?? 0, archived: Boolean(product.archivedAt),
  })) };
}

async function readCategories(householdId: string): Promise<InventoryCategory[]> {
  const records = await Category.find({ householdId }).sort({ name: 1 }).lean();
  return records.map((item) => ({ id: item._id.toString(), name: item.name, parentId: item.parentId?.toString() ?? null }));
}

export async function listInventoryCategories(actor: HouseholdActor, householdId: string) {
  await requireInventoryReadAccess(actor, householdId);
  return readCategories(householdId);
}

export async function getInventoryProduct(actor: HouseholdActor, householdId: string, productId: string) {
  const access = await requireInventoryReadAccess(actor, householdId);
  const product = await Product.findOne({ _id: requireObjectId(productId), householdId: access.householdId }).lean();
  if (!product) return null;
  return { id: product._id.toString(), name: product.name, unit: product.unit, quantity: product.quantity,
    categoryId: product.categoryId?.toString() ?? null, lowStockThreshold: product.lowStockThreshold,
    revision: product.revision ?? 0, archived: Boolean(product.archivedAt) };
}

export async function listInventoryActivity(actor: HouseholdActor, householdId: string, productId?: string) {
  const access = await requireInventoryReadAccess(actor, householdId);
  const filter = { householdId: access.householdId, ...(productId ? { productId: requireObjectId(productId) } : {}) };
  const movements = await StockMovement.find(filter).sort({ createdAt: -1, _id: -1 }).limit(50).lean();
  const [users, products, undone] = await Promise.all([
    User.find({ _id: { $in: movements.map((item) => item.actorId) } }).select("name").lean(),
    Product.find({ householdId: access.householdId, _id: { $in: movements.map((item) => item.productId) } }).select("name").lean(),
    StockMovement.find({ householdId: access.householdId, undoOfMovementId: { $in: movements.map((item) => item._id) } }).select("undoOfMovementId").lean(),
  ]);
  const names = new Map(users.map((user) => [user._id.toString(), user.name]));
  const productNames = new Map(products.map((product) => [product._id.toString(), product.name]));
  const undoneIds = new Set(undone.map((item) => item.undoOfMovementId?.toString()));
  return movements.map((item) => ({ id: item._id.toString(), productId: item.productId.toString(), productName: productNames.get(item.productId.toString()) ?? "Producto",
    actorName: names.get(item.actorId.toString()) ?? "Persona del hogar", delta: item.delta, reason: item.reason,
    quantityBefore: item.quantityBefore, quantityAfter: item.quantityAfter, createdAt: item.createdAt?.toISOString() ?? null,
    canUndo: item.reason !== "undo" && !undoneIds.has(item._id.toString()) }));
}
