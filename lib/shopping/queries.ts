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
  // Select the purchase before applying search so older purchases cannot surface through filters.
  const latestReceipt = status === "received" ? await ShoppingItem.findOne({ householdId: access.householdId, status: "received" }).sort({ receivedAt: -1, _id: -1 }).select("receiptId receivedAt").lean() : null;
  const receiptFilter = status !== "received" ? {} : latestReceipt?.receiptId ? { receiptId: latestReceipt.receiptId } : latestReceipt ? { receiptId: null, receivedAt: latestReceipt.receivedAt } : { _id: { $in: [] } };
  const filter = { ...receiptFilter, householdId: access.householdId, status, ...(query.trim() ? { name: literalNamePattern(query.trim().slice(0, 160)) } : {}) };
  // The displayed purchase and its receipt selection must share the same document versions.
  const includeReceipt = status === "purchased" && !query.trim();
  const items = await ShoppingItem.find(filter).sort(status === "received" ? { receivedAt: -1, _id: -1 } : { createdAt: 1, _id: 1 }).lean();
  return { total: items.length,
    receiptItems: includeReceipt ? items.map((item) => ({ id: item._id.toString(), revision: item.revision ?? 0, quantity: item.quantity })) : [],
    items: items.map((item) => ({
    id: item._id.toString(), name: item.name, unit: item.unit ?? "unidades", quantity: item.quantity,
    productId: item.productId?.toString() ?? null, status: item.status, revision: item.revision ?? 0,
    receivedQuantity: item.receivedQuantity ?? null, receivedAt: item.receivedAt?.toISOString() ?? null,
  })) };
}

export async function shoppingProductOptions(actor: HouseholdActor, householdId: string, query = "") {
  const access = await requireInventoryReadAccess(actor, householdId);
  return Product.find({ householdId: access.householdId, archivedAt: null, ...(query.trim() ? { name: literalNamePattern(query.trim().slice(0, 160)) } : {}) }).select("name unit").sort({ name: 1, _id: 1 }).limit(100).lean().then((products) => products.map((product) => ({ id: product._id.toString(), name: product.name, unit: product.unit })));
}
