import ShoppingItem from "@/models/ShoppingItem";
import Product from "@/models/Product";
import { requireObjectId } from "@/lib/households/access";
import type { HouseholdActor } from "@/lib/households/mutation-access";
import { requireInventoryReadAccess } from "@/lib/inventory/queries";
import { literalNamePattern } from "@/lib/inventory/activity-filters";

import type { ShoppingStatus } from "./state";

export async function getShoppingItem(actor: HouseholdActor, householdId: string, itemId: string) {
  const access = await requireInventoryReadAccess(actor, householdId);
  const item = await ShoppingItem.findOne({ _id: requireObjectId(itemId), householdId: access.householdId }).lean();
  return item ? { id: item._id.toString(), status: item.status, revision: item.revision ?? 0, quantity: item.quantity } : null;
}

export async function listShoppingItems(actor: HouseholdActor, householdId: string, status: ShoppingStatus, query = "") {
  const access = await requireInventoryReadAccess(actor, householdId);
  const filter = { householdId: access.householdId, status, ...(query.trim() ? { name: literalNamePattern(query.trim().slice(0, 160)) } : {}) };
  // The displayed purchase and its receipt selection must share the same document versions.
  const includeReceipt = status === "purchased" && !query.trim();
  const [items, total] = await Promise.all([
    ShoppingItem.find(filter).sort(status === "received" ? { receivedAt: -1, _id: -1 } : { createdAt: 1, _id: 1 }).limit(includeReceipt ? 0 : 100).lean(),
    includeReceipt ? Promise.resolve(null) : ShoppingItem.countDocuments(filter),
  ]);
  return { total: total ?? items.length,
    receiptItems: includeReceipt ? items.map((item) => ({ id: item._id.toString(), revision: item.revision ?? 0, quantity: item.quantity })) : [],
    items: items.slice(0, 100).map((item) => ({
    id: item._id.toString(), name: item.name, unit: item.unit ?? "unidades", quantity: item.quantity,
    productId: item.productId?.toString() ?? null, status: item.status, revision: item.revision ?? 0,
    receivedQuantity: item.receivedQuantity ?? null, receivedAt: item.receivedAt?.toISOString() ?? null,
  })) };
}

export async function shoppingProductOptions(actor: HouseholdActor, householdId: string, query = "") {
  const access = await requireInventoryReadAccess(actor, householdId);
  return Product.find({ householdId: access.householdId, archivedAt: null, ...(query.trim() ? { name: literalNamePattern(query.trim().slice(0, 160)) } : {}) }).select("name unit").sort({ name: 1, _id: 1 }).limit(100).lean().then((products) => products.map((product) => ({ id: product._id.toString(), name: product.name, unit: product.unit })));
}
