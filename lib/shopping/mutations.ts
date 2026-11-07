import { sixMonthsAfter } from "@/lib/retention";
import { Types } from "mongoose";
import { createHash } from "node:crypto";
import ShoppingItem from "@/models/ShoppingItem";
import Product from "@/models/Product";
import { AccountError } from "@/lib/auth/validation";
import { requireObjectId } from "@/lib/households/access";
import type { HouseholdActor } from "@/lib/households/mutation-access";
import { mutateInventory, changeQuantity, type MutationContext } from "@/lib/inventory/mutations";
import { requireProductInHousehold } from "@/lib/inventory/references";
import { inventoryName, wholeNumber } from "@/lib/inventory/validation";

export function shoppingQuantity(value: unknown) {
  const quantity = wholeNumber(value);
  if (quantity < 1) throw new AccountError("La cantidad debe ser al menos 1.");
  return quantity;
}

async function addItem(context: MutationContext, productId: Types.ObjectId | null, name: string, quantity: number, unit: string) {
  if (productId) {
    const existing = await ShoppingItem.findOne({ householdId: context.householdId, productId, status: { $in: ["pending", "purchased"] } }).session(context.session);
    if (existing) return { id: existing._id.toString(), movementId: null };
  }
  const [item] = await ShoppingItem.create([{ householdId: context.householdId, productId, name, quantity, unit, addedById: context.actorId }], { session: context.session });
  return { id: item._id.toString(), movementId: null };
}

export async function addShoppingItem(actor: HouseholdActor, householdId: string, requestId: string, input: { productId: unknown; name: unknown; quantity: unknown; unit: unknown }) {
  const productId = input.productId === "" || input.productId == null ? null : requireObjectId(String(input.productId));
  const quantity = shoppingQuantity(input.quantity);
  const name = productId ? "" : inventoryName(input.name);
  const unit = productId ? "" : inventoryName(input.unit, 60);
  return mutateInventory(actor, householdId, requestId, "shopping-add", { productId, name, quantity, unit }, async (context) => {
    if (!productId) return addItem(context, null, name, quantity, unit);
    const product = await requireProductInHousehold(context.householdId, productId, context.session);
    if (product.archivedAt) throw new AccountError("Restaura el producto antes de agregarlo a la lista.");
    return addItem(context, productId, product.name, quantity, product.unit);
  });
}

export async function addLowStockToShopping(actor: HouseholdActor, householdId: string, requestId: string) {
  return mutateInventory(actor, householdId, requestId, "shopping-low-stock", {}, async (context) => {
    const products = await Product.find({ householdId: context.householdId, archivedAt: null, $or: [{ quantity: 0 }, { lowStockThreshold: { $ne: null }, $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }] }).session(context.session).lean();
    for (const product of products) await addItem(context, product._id, product.name, 1, product.unit);
    return { id: householdId, movementId: null };
  });
}

async function editableItem(context: MutationContext, id: Types.ObjectId, revision: number) {
  const item = await ShoppingItem.findOne({ _id: id, householdId: context.householdId }).session(context.session);
  if (!item) throw new AccountError("El artículo no pertenece a este hogar o ya fue eliminado.");
  if (item.status === "received") throw new AccountError("Este artículo ya fue recibido. No se puede registrar dos veces.");
  if ((item.revision ?? 0) !== revision) throw new AccountError("La lista cambió. Actualiza la página antes de continuar.");
  return item;
}

export async function setShoppingPurchased(actor: HouseholdActor, householdId: string, requestId: string, itemId: string, expectedRevision: unknown, purchased: boolean, rawQuantity?: unknown) {
  const id = requireObjectId(itemId);
  const revision = wholeNumber(expectedRevision);
  const quantity = purchased && rawQuantity !== undefined ? shoppingQuantity(rawQuantity) : null;
  return mutateInventory(actor, householdId, requestId, "shopping-purchase", { id, revision, purchased, ...(quantity !== null ? { quantity } : {}) }, async (context) => {
    const item = await editableItem(context, id, revision);
    if (quantity !== null) item.quantity = quantity;
    item.status = purchased ? "purchased" : "pending";
    item.revision = revision + 1;
    await item.save({ session: context.session });
    return { id: itemId, movementId: null };
  });
}

export async function editShoppingQuantity(actor: HouseholdActor, householdId: string, requestId: string, itemId: string, expectedRevision: unknown, rawQuantity: unknown) {
  const id = requireObjectId(itemId);
  const revision = wholeNumber(expectedRevision);
  const quantity = shoppingQuantity(rawQuantity);
  return mutateInventory(actor, householdId, requestId, "shopping-edit", { id, revision, quantity }, async (context) => {
    const item = await editableItem(context, id, revision);
    item.quantity = quantity;
    item.revision = revision + 1;
    await item.save({ session: context.session });
    return { id: itemId, movementId: null };
  });
}

export async function deleteShoppingItem(actor: HouseholdActor, householdId: string, requestId: string, itemId: string, expectedRevision: unknown) {
  const id = requireObjectId(itemId);
  const revision = wholeNumber(expectedRevision);
  return mutateInventory(actor, householdId, requestId, "shopping-delete", { id, revision }, async (context) => {
    await editableItem(context, id, revision);
    await ShoppingItem.deleteOne({ _id: id, householdId: context.householdId }, { session: context.session });
    return { id: itemId, movementId: null };
  });
}

async function receiveItem(context: MutationContext, id: Types.ObjectId, revision: number, quantity: number, requestId: string, receiptId = requestId, receivedAt = new Date()) {
  const item = await editableItem(context, id, revision);
  if (item.status !== "purchased") throw new AccountError("Marca el artículo como comprado antes de confirmar la recepción.");
  if (item.productId) {
    const product = await requireProductInHousehold(context.householdId, item.productId, context.session);
    if (product.unit !== item.unit) throw new AccountError("La unidad del producto cambió. Quita este artículo y agrégalo de nuevo antes de recibirlo.");
  }
  const movementId = item.productId ? await changeQuantity(context, item.productId, requestId, quantity, "receipt") : null;
  item.status = "received";
  item.receivedQuantity = quantity;
  item.receivedAt = receivedAt;
  item.retentionExpiresAt = sixMonthsAfter(receivedAt);
  item.receiptId = receiptId;
  item.receivedMovementId = movementId ? new Types.ObjectId(movementId) : null;
  item.revision = revision + 1;
  await item.save({ session: context.session });
  return { id: id.toString(), movementId };
}

export async function receiveShoppingItem(actor: HouseholdActor, householdId: string, requestId: string, itemId: string, expectedRevision: unknown, rawQuantity: unknown) {
  const id = requireObjectId(itemId);
  const revision = wholeNumber(expectedRevision);
  const quantity = shoppingQuantity(rawQuantity);
  return mutateInventory(actor, householdId, requestId, "shopping-receive", { id, revision, quantity }, (context) => receiveItem(context, id, revision, quantity, requestId));
}

export function receiptSelection(value: unknown) {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); }
    catch { throw new AccountError("La compra no es válida. Actualiza la lista."); }
  }
  if (!Array.isArray(parsed) || !parsed.length) throw new AccountError("No hay artículos para recibir. Actualiza la lista.");
  const selected = parsed.map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("id" in entry) || typeof entry.id !== "string" || !("revision" in entry) || !("quantity" in entry)) throw new AccountError("La compra no es válida. Actualiza la lista.");
    return { id: requireObjectId(entry.id).toString(), revision: wholeNumber(entry.revision), quantity: shoppingQuantity(entry.quantity) };
  }).sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(selected.map((item) => item.id)).size !== selected.length) throw new AccountError("La compra contiene artículos repetidos. Actualiza la lista.");
  return selected;
}

export async function receivePurchasedItems(actor: HouseholdActor, householdId: string, requestId: string, rawItems: unknown) {
  const selected = receiptSelection(rawItems);
  return mutateInventory(actor, householdId, requestId, "shopping-receive-batch", selected, async (context) => {
    const receivedAt = new Date();
    // Only the reviewed snapshot is received; later purchases stay in Comprados.
    for (const entry of selected) {
      const id = requireObjectId(entry.id);
      const item = await editableItem(context, id, entry.revision);
      if (item.quantity !== entry.quantity) throw new AccountError("Las cantidades cambiaron. Actualiza la lista antes de recibir la compra.");
      const movementRequestId = createHash("sha256").update(JSON.stringify([requestId, entry.id])).digest("hex");
      await receiveItem(context, id, entry.revision, entry.quantity, movementRequestId, requestId, receivedAt);
    }
    return { id: householdId, movementId: null };
  });
}
