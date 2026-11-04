"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/session";
import { AccountError } from "@/lib/auth/validation";
import { HouseholdAccessError } from "@/lib/households/access";
import { adjustStock, correctStock, createProduct, deleteCategory, editProduct, saveCategory, setProductArchived, undoStockMovement } from "@/lib/inventory/mutations";
import type { AccountFormState } from "@/lib/auth/form-state";

function field(data: FormData, name: string) {
  const value = data.get(name);
  if (typeof value !== "string") throw new AccountError("Faltan datos. Actualiza la página antes de intentar de nuevo.");
  return value;
}

function productInput(data: FormData) {
  return { name: data.get("name"), unit: data.get("unit"), categoryId: data.get("categoryId"), lowStockThreshold: data.get("lowStockThreshold") };
}

export async function inventoryAction(_state: AccountFormState, data: FormData): Promise<AccountFormState> {
  const user = await requireVerifiedUser();
  try {
    const householdId = field(data, "householdId");
    const requestId = field(data, "requestId");
    const kind = field(data, "kind");
    switch (kind) {
      case "create-product": await createProduct(user, householdId, requestId, { ...productInput(data), quantity: data.get("quantity") }); break;
      case "edit-product": await editProduct(user, householdId, requestId, field(data, "productId"), data.get("revision"), productInput(data)); break;
      case "archive-product": await setProductArchived(user, householdId, requestId, field(data, "productId"), true); break;
      case "restore-product": await setProductArchived(user, householdId, requestId, field(data, "productId"), false); break;
      case "adjust-stock": {
        const delta = field(data, "delta");
        if (delta !== "1" && delta !== "-1") throw new AccountError("Usa los botones para sumar o restar una unidad.");
        await adjustStock(user, householdId, requestId, field(data, "productId"), Number(delta));
        break;
      }
      case "correct-stock": await correctStock(user, householdId, requestId, field(data, "productId"), data.get("revision"), data.get("quantity")); break;
      case "undo-stock": await undoStockMovement(user, householdId, requestId, field(data, "movementId")); break;
      case "save-category": await saveCategory(user, householdId, requestId, { ...(data.get("categoryId") ? { id: field(data, "categoryId") } : {}), name: data.get("name"), parentId: data.get("parentId") }); break;
      case "delete-category": await deleteCategory(user, householdId, requestId, field(data, "categoryId")); break;
      default: throw new AccountError("Esta operación no es válida.");
    }
    revalidatePath("/inventory", "layout");
    revalidatePath("/household");
    return { success: true, message: kind === "undo-stock" ? "Movimiento deshecho. Se conservaron los cambios posteriores." : "Cambio guardado y compartido con tu hogar." };
  } catch (error) {
    if (error instanceof AccountError || error instanceof HouseholdAccessError) return { success: false, message: error.message };
    console.error("Inventory operation unavailable");
    return { success: false, retryable: true, message: "No pudimos confirmar el cambio. Reintenta la misma operación; una solicitud repetida no se aplicará dos veces." };
  }
}
