import { AccountError } from "@/lib/auth/validation";
import { requireHouseholdAccess, requireObjectId } from "@/lib/households/access";
import type { HouseholdActor } from "@/lib/households/mutation-access";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Product, { type IProduct } from "@/models/Product";
import type { Types } from "mongoose";
import Category from "@/models/Category";
import ShoppingItem from "@/models/ShoppingItem";
import StockMovement from "@/models/StockMovement";
import { parseActivityFilters, literalNamePattern, type ActivityFilters } from "./activity-filters";
import { descendantCategoryIds, type InventoryCategory } from "./categories";
import { INVENTORY_PAGE_SIZE } from "./limits";
import { inventoryPagination } from "./pagination";
import { INVENTORY_NAME_COLLATION } from "./stock-status";

export async function requireInventoryReadAccess(actor: HouseholdActor, householdId: string) {
  await connectToDatabase();
  if (!await User.exists({ _id: requireObjectId(actor.id), sessionVersion: actor.sessionVersion, emailVerifiedAt: { $ne: null } })) {
    throw new AccountError("Inicia sesión de nuevo y verifica tu correo para continuar.");
  }
  return requireHouseholdAccess(actor.id, householdId);
}

export async function listInventory(actor: HouseholdActor, householdId: string, filters: { query?: string; categoryId?: string; lowStock?: boolean; archived?: boolean; page?: number } = {}) {
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
    ...(filters.lowStock ? { $or: [{ quantity: 0 }, { lowStockThreshold: { $ne: null }, $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }] } : {}),
  };
  const total = await Product.countDocuments(filter);
  const { page, pageCount, offset } = inventoryPagination(total, filters.page);
  const records = filters.archived ? Product.find(filter).collation(INVENTORY_NAME_COLLATION).sort({ name: 1, _id: 1 }).skip(offset).limit(INVENTORY_PAGE_SIZE).lean() : Product.aggregate<IProduct & { _id: Types.ObjectId }>([
    { $match: filter },
    { $addFields: { stockPriority: { $switch: { branches: [
      { case: { $eq: ["$quantity", 0] }, then: 0 },
      { case: { $and: [{ $ne: [{ $ifNull: ["$lowStockThreshold", null] }, null] }, { $lte: ["$quantity", "$lowStockThreshold"] }] }, then: 1 },
    ], default: 2 } } } },
    { $sort: { stockPriority: 1, name: 1, _id: 1 } },
    { $skip: offset },
    { $limit: INVENTORY_PAGE_SIZE },
    { $unset: "stockPriority" },
  ]).collation(INVENTORY_NAME_COLLATION);
  const products = await records;
  return { categories, total, page, pageCount, products: products.map((product) => ({
    id: product._id.toString(), name: product.name, unit: product.unit, quantity: product.quantity,
    categoryId: product.categoryId?.toString() ?? null, lowStockThreshold: product.lowStockThreshold ?? null,
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
    categoryId: product.categoryId?.toString() ?? null, lowStockThreshold: product.lowStockThreshold ?? null,
    revision: product.revision ?? 0, archived: Boolean(product.archivedAt) };
}

export async function listInventoryActivity(actor: HouseholdActor, householdId: string, productId?: string, filters: Partial<ActivityFilters> = {}) {
  const access = await requireInventoryReadAccess(actor, householdId);
  const parsed = parseActivityFilters(filters);
  if (parsed.error) throw new AccountError(parsed.error);
  const selectedProductId = productId ? requireObjectId(productId) : undefined;
  const query = parsed.filters.query;
  const person = parsed.filters.person;
  const [matchingProducts, matchingActors] = await Promise.all([
    query ? Product.find({ householdId: access.householdId, ...(selectedProductId ? { _id: selectedProductId } : {}), name: literalNamePattern(query) }).select("_id").lean() : null,
    person ? StockMovement.distinct("actorId", { householdId: access.householdId }).then((actorIds) => User.find({ _id: { $in: actorIds }, name: literalNamePattern(person) }).select("_id").lean()) : null,
  ]);
  const filter = {
    householdId: access.householdId,
    ...(matchingProducts ? { productId: { $in: matchingProducts.map((item) => item._id) } } : selectedProductId ? { productId: selectedProductId } : {}),
    ...(matchingActors ? { actorId: { $in: matchingActors.map((item) => item._id) } } : {}),
    ...(Object.keys(parsed.dateRange).length ? { createdAt: parsed.dateRange } : {}),
  };
  const movements = await StockMovement.find(filter).sort({ createdAt: -1, _id: -1 }).limit(50).lean();
  const [users, products, undone, purchased] = await Promise.all([
    User.find({ _id: { $in: movements.map((item) => item.actorId) } }).select("name").lean(),
    Product.find({ householdId: access.householdId, _id: { $in: movements.map((item) => item.productId) } }).select("name").lean(),
    StockMovement.find({ householdId: access.householdId, undoOfMovementId: { $in: movements.map((item) => item._id) } }).select("undoOfMovementId").lean(),
    ShoppingItem.find({ householdId: access.householdId, receivedMovementId: { $in: movements.map((item) => item._id) } }).select("receivedMovementId").lean(),
  ]);
  const names = new Map(users.map((user) => [user._id.toString(), user.name]));
  const productNames = new Map(products.map((product) => [product._id.toString(), product.name]));
  const purchaseMovementIds = new Set(purchased.map((item) => item.receivedMovementId?.toString()));
  const undoneIds = new Set(undone.map((item) => item.undoOfMovementId?.toString()));
  return movements.map((item) => ({ id: item._id.toString(), productId: item.productId.toString(), productName: productNames.get(item.productId.toString()) ?? "Producto",
    actorName: names.get(item.actorId.toString()) ?? "Persona del hogar", delta: item.delta, reason: item.reason,
    quantityBefore: item.quantityBefore, quantityAfter: item.quantityAfter, createdAt: item.createdAt?.toISOString() ?? null,
    purchaseReceipt: purchaseMovementIds.has(item._id.toString()),
    canUndo: item.reason !== "undo" && !undoneIds.has(item._id.toString()) }));
}
