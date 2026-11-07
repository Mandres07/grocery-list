import mongoose, { Types, type ClientSession } from "mongoose";
import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { AccountError } from "@/lib/auth/validation";
import { requireObjectId } from "@/lib/households/access";
import { lockHouseholdAccess, type HouseholdActor } from "@/lib/households/mutation-access";
import Product from "@/models/Product";
import Category from "@/models/Category";
import StockMovement from "@/models/StockMovement";
import InventoryRequest from "@/models/InventoryRequest";
import { requireCategoryInHousehold, requireProductInHousehold, validateCategoryParent } from "./references";
import { inventoryName, inventoryRequestId, optionalId, optionalQuantity, wholeNumber } from "./validation";
import { sixMonthsAfter, unexpiredHistory } from "@/lib/retention";
import { isFreshInventoryRequest, requestIssuedAt } from "./request-id";
import { MAX_CATEGORIES, MAX_PRODUCT_BATCH_SIZE } from "./limits";

interface Result { id: string; movementId: string | null }
export interface MutationContext { session: ClientSession; householdId: Types.ObjectId; actorId: Types.ObjectId }

export async function mutateInventory(actor: HouseholdActor, householdId: string, requestId: string, operation: string, payload: unknown,
  operationBody: (context: MutationContext) => Promise<Result>) {
  inventoryRequestId(requestId);
  const household = requireObjectId(householdId);
  const fingerprint = createHash("sha256").update(JSON.stringify({ actorId: actor.id, operation, payload })).digest("hex");
  await connectToDatabase();
  try {
    return await mongoose.connection.transaction(async (session) => {
      const access = await lockHouseholdAccess(actor, householdId, session);
      const previous = await InventoryRequest.findOne({ householdId: household, requestId }).session(session);
      const now = new Date(Date.now());
      const issuedAt = requestIssuedAt(requestId);
      if (issuedAt !== null && !isFreshInventoryRequest(requestId, now.getTime())) throw new AccountError("La solicitud venció. Actualiza la página antes de continuar.");
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new AccountError("Esta solicitud ya se usó para otra operación. Actualiza la página.");
        return { id: previous.resultId.toString(), movementId: previous.movementId?.toString() ?? null };
      }
      // Untimestamped legacy keys can replay an existing result, never execute anew.
      if (!isFreshInventoryRequest(requestId, now.getTime())) throw new AccountError("La solicitud venció. Actualiza la página antes de continuar.");
      const result = await operationBody({ session, householdId: household, actorId: access.user._id });
      await InventoryRequest.create([{ householdId: household, requestId, fingerprint, resultId: result.id, movementId: result.movementId, retentionExpiresAt: sixMonthsAfter(now) }], { session });
      return result;
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) throw new AccountError("Ya existe un registro con esos datos. Actualiza la página antes de intentar de nuevo.");
    throw error;
  }
}

async function movement(context: MutationContext, productId: Types.ObjectId, requestId: string, before: number, after: number,
  reason: "receipt" | "consumption" | "correction" | "undo", undoOfMovementId: Types.ObjectId | null = null) {
  if (before === after) return null;
  const [record] = await StockMovement.create([{
    householdId: context.householdId, productId, actorId: context.actorId, requestId,
    retentionExpiresAt: sixMonthsAfter(new Date()),
    delta: after - before, quantityBefore: before, quantityAfter: after, reason, undoOfMovementId,
  }], { session: context.session });
  return record._id.toString();
}

export interface ProductInput { name: unknown; unit: unknown; categoryId: unknown; quantity: unknown; lowStockThreshold: unknown; newCategoryName?: unknown; newCategoryParentId?: unknown }
function productFields(input: Omit<ProductInput, "quantity">) {
  return { name: inventoryName(input.name), unit: inventoryName(input.unit, 60), categoryId: optionalId(input.categoryId), lowStockThreshold: optionalQuantity(input.lowStockThreshold) };
}

function categoryDraft(input: Omit<ProductInput, "quantity">) {
  const name = input.newCategoryName == null || input.newCategoryName === "" ? null : inventoryName(input.newCategoryName, 100);
  const parentId = optionalId(input.newCategoryParentId ?? null);
  if (!name && parentId) throw new AccountError("Escribe el nombre de la nueva categoría.");
  if (name && optionalId(input.categoryId)) throw new AccountError("Elige una categoría existente o crea una nueva.");
  return name ? { name, parentId } : null;
}

async function requireCategoryCapacity(context: MutationContext) {
  if (await Category.countDocuments({ householdId: context.householdId }).session(context.session) >= MAX_CATEGORIES) {
    throw new AccountError(`Tu hogar puede tener hasta ${MAX_CATEGORIES} categorías, incluidas las subcategorías. Elimina una categoría vacía antes de crear otra.`);
  }
}

async function resolveProductCategory(context: MutationContext, categoryId: Types.ObjectId | null, draft: ReturnType<typeof categoryDraft>) {
  if (!draft) {
    if (categoryId) await requireCategoryInHousehold(context.householdId, categoryId, context.session);
    return categoryId;
  }
  if (draft.parentId) await requireCategoryInHousehold(context.householdId, draft.parentId, context.session);
  const existing = await Category.findOne({ householdId: context.householdId, ...draft }).collation({ locale: "es", strength: 2 }).session(context.session);
  if (existing) return existing._id;
  await requireCategoryCapacity(context);
  const [category] = await Category.create([{ householdId: context.householdId, ...draft }], { session: context.session });
  return category._id;
}

export async function createProduct(actor: HouseholdActor, householdId: string, requestId: string, input: ProductInput) {
  const fields = { ...productFields(input), quantity: wholeNumber(input.quantity) };
  const draft = categoryDraft(input);
  return mutateInventory(actor, householdId, requestId, "product-create", { ...fields, ...(draft ? { draft } : {}) }, async (context) => {
    const categoryId = await resolveProductCategory(context, fields.categoryId, draft);
    const [product] = await Product.create([{ householdId: context.householdId, ...fields, categoryId }], { session: context.session });
    return { id: product._id.toString(), movementId: await movement(context, product._id, requestId, 0, fields.quantity, "receipt") };
  });
}

export async function createProducts(actor: HouseholdActor, householdId: string, requestId: string, input: {
  categoryId: unknown; names: unknown[]; quantities: unknown[]; thresholds: unknown[];
}) {
  const { names, quantities, thresholds } = input;
  if (!names.length || names.length > MAX_PRODUCT_BATCH_SIZE || quantities.length !== names.length || thresholds.length !== names.length) {
    throw new AccountError(`Agrega entre 1 y ${MAX_PRODUCT_BATCH_SIZE} productos con sus cantidades y avisos.`);
  }
  const categoryId = optionalId(input.categoryId);
  const products = names.map((name, index) => {
    try {
      return { name: inventoryName(name), unit: "unidades", quantity: wholeNumber(quantities[index]), lowStockThreshold: optionalQuantity(thresholds[index]) };
    } catch (error) {
      if (error instanceof AccountError) throw new AccountError(`Producto ${index + 1}: ${error.message}`);
      throw error;
    }
  });
  return mutateInventory(actor, householdId, requestId, "products-create", { categoryId, products }, async (context) => {
    if (categoryId) await requireCategoryInHousehold(context.householdId, categoryId, context.session);
    const created = await Product.insertMany(products.map((product) => ({ ...product, categoryId, householdId: context.householdId })), { session: context.session });
    let firstMovementId: string | null = null;
    for (const product of created) {
      const movementRequestId = createHash("sha256").update(JSON.stringify([requestId, product._id.toString()])).digest("hex");
      const movementId = await movement(context, product._id, movementRequestId, 0, product.quantity, "receipt");
      firstMovementId ??= movementId;
    }
    return { id: created[0]._id.toString(), movementId: firstMovementId };
  });
}

function revisionFilter(expectedRevision: number) {
  return expectedRevision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision: expectedRevision };
}

export async function editProduct(actor: HouseholdActor, householdId: string, requestId: string, productId: string,
  expectedRevision: unknown, input: Omit<ProductInput, "quantity">) {
  const id = requireObjectId(productId);
  const revision = wholeNumber(expectedRevision);
  const fields = productFields(input);
  const draft = categoryDraft(input);
  return mutateInventory(actor, householdId, requestId, "product-edit", { id, revision, ...fields, ...(draft ? { draft } : {}) }, async (context) => {
    const categoryId = await resolveProductCategory(context, fields.categoryId, draft);
    const updated = await Product.updateOne({ _id: id, householdId: context.householdId, archivedAt: null, ...revisionFilter(revision) }, { $set: { ...fields, categoryId }, $inc: { revision: 1 } }, { session: context.session, runValidators: true });
    if (!updated.modifiedCount) throw new AccountError("El producto cambió o ya no está disponible. Actualiza la página antes de editarlo.");
    return { id: productId, movementId: null };
  });
}

export async function setProductArchived(actor: HouseholdActor, householdId: string, requestId: string, productId: string, archived: boolean) {
  const id = requireObjectId(productId);
  return mutateInventory(actor, householdId, requestId, "product-archive", { id, archived }, async (context) => {
    const product = await requireProductInHousehold(context.householdId, id, context.session);
    if (Boolean(product.archivedAt) !== archived) await Product.updateOne({ _id: id, householdId: context.householdId }, { $set: { archivedAt: archived ? new Date() : null }, $inc: { revision: 1 } }, { session: context.session });
    return { id: productId, movementId: null };
  });
}

export async function changeQuantity(context: MutationContext, productId: Types.ObjectId, requestId: string, delta: number,
  reason: "receipt" | "consumption" | "correction" | "undo", undoOfMovementId: Types.ObjectId | null = null) {
  const before = await Product.findOneAndUpdate({
    _id: productId, householdId: context.householdId, archivedAt: null,
    quantity: { $gte: delta < 0 ? -delta : 0, $lte: delta > 0 ? Number.MAX_SAFE_INTEGER - delta : Number.MAX_SAFE_INTEGER },
  }, { $inc: { quantity: delta, revision: 1 } }, { session: context.session, returnDocument: "before" });
  if (!before) throw new AccountError("No se puede aplicar el cambio. Revisa las existencias y que el producto siga activo.");
  return movement(context, productId, requestId, before.quantity, before.quantity + delta, reason, undoOfMovementId);
}

export async function adjustStock(actor: HouseholdActor, householdId: string, requestId: string, productId: string, delta: number) {
  const id = requireObjectId(productId);
  if (!Number.isSafeInteger(delta) || delta === 0) throw new AccountError("Usa un cambio entero distinto de cero.");
  return mutateInventory(actor, householdId, requestId, "stock-adjust", { id, delta }, async (context) => ({
    id: productId, movementId: await changeQuantity(context, id, requestId, delta, delta > 0 ? "receipt" : "consumption"),
  }));
}

export async function correctStock(actor: HouseholdActor, householdId: string, requestId: string, productId: string, expectedRevision: unknown, rawQuantity: unknown) {
  const id = requireObjectId(productId);
  const revision = wholeNumber(expectedRevision);
  const quantity = wholeNumber(rawQuantity);
  return mutateInventory(actor, householdId, requestId, "stock-correct", { id, revision, quantity }, async (context) => {
    const product = await Product.findOne({ _id: id, householdId: context.householdId, archivedAt: null, ...revisionFilter(revision) }).session(context.session);
    if (!product) throw new AccountError("Las existencias cambiaron. Actualiza la página y revisa la cantidad antes de corregirla.");
    const before = product.quantity;
    if (before === quantity) return { id: productId, movementId: null };
    const updated = await Product.updateOne({ _id: id, householdId: context.householdId, ...revisionFilter(revision) }, { $set: { quantity }, $inc: { revision: 1 } }, { session: context.session, runValidators: true });
    if (!updated.modifiedCount) throw new AccountError("Las existencias cambiaron. Actualiza la página.");
    return { id: productId, movementId: await movement(context, id, requestId, before, quantity, "correction") };
  });
}

export async function undoStockMovement(actor: HouseholdActor, householdId: string, requestId: string, movementId: string) {
  const id = requireObjectId(movementId);
  return mutateInventory(actor, householdId, requestId, "stock-undo", { id }, async (context) => {
    const original = await StockMovement.findOne({ _id: id, householdId: context.householdId, ...unexpiredHistory("createdAt") }).session(context.session);
    if (!original || original.reason === "undo" || await StockMovement.exists({ householdId: context.householdId, undoOfMovementId: id }).session(context.session)) {
      throw new AccountError("Este movimiento no se puede deshacer o ya fue deshecho.");
    }
    return { id: original.productId.toString(), movementId: await changeQuantity(context, original.productId, requestId, -original.delta, "undo", original._id) };
  });
}

export async function saveCategory(actor: HouseholdActor, householdId: string, requestId: string, input: { id?: string; name: unknown; parentId: unknown }) {
  const id = input.id ? requireObjectId(input.id) : new Types.ObjectId();
  const name = inventoryName(input.name, 100);
  const parentId = optionalId(input.parentId);
  return mutateInventory(actor, householdId, requestId, input.id ? "category-edit" : "category-create", { id: input.id ?? null, name, parentId }, async (context) => {
    if (input.id) await requireCategoryInHousehold(context.householdId, id, context.session);
    await validateCategoryParent(context.householdId, id, parentId, context.session);
    if (input.id) await Category.updateOne({ _id: id, householdId: context.householdId }, { $set: { name, parentId } }, { session: context.session, runValidators: true });
    else {
      await requireCategoryCapacity(context);
      await Category.create([{ _id: id, householdId: context.householdId, name, parentId }], { session: context.session });
    }
    return { id: id.toString(), movementId: null };
  });
}

export async function deleteCategory(actor: HouseholdActor, householdId: string, requestId: string, categoryId: string) {
  const id = requireObjectId(categoryId);
  return mutateInventory(actor, householdId, requestId, "category-delete", { id }, async (context) => {
    await requireCategoryInHousehold(context.householdId, id, context.session);
    if (await Product.exists({ householdId: context.householdId, categoryId: id }).session(context.session) || await Category.exists({ householdId: context.householdId, parentId: id }).session(context.session)) {
      throw new AccountError("Mueve primero los productos y las subcategorías, incluidos los productos archivados.");
    }
    await Category.deleteOne({ _id: id, householdId: context.householdId }, { session: context.session });
    return { id: categoryId, movementId: null };
  });
}
