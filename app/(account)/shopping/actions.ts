"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/session";
import { AccountError } from "@/lib/auth/validation";
import { HouseholdAccessError } from "@/lib/households/access";
import type { AccountFormState } from "@/lib/auth/form-state";
import { addShoppingItem, addLowStockToShopping, setShoppingPurchased, editShoppingQuantity, deleteShoppingItem, receiveShoppingItem, receivePurchasedItems } from "@/lib/shopping/mutations";
import { getShoppingItem, shoppingProductOptions } from "@/lib/shopping/queries";
import type { ShoppingSnapshot } from "@/lib/shopping/state";

function field(data: FormData, name: string) {
  const value = data.get(name);
  if (typeof value !== "string") throw new AccountError("Faltan datos. Actualiza la página.");
  return value;
}

export async function shoppingAction(_state: AccountFormState, data: FormData): Promise<AccountFormState & { item?: ShoppingSnapshot }> {
  const user = await requireVerifiedUser();
  try {
    const householdId = field(data, "householdId");
    const requestId = field(data, "requestId");
    const kind = field(data, "kind");
    let item: ShoppingSnapshot | undefined;
    switch (kind) {
      case "add": await addShoppingItem(user, householdId, requestId, { productId: data.get("productId"), name: data.get("name"), quantity: data.get("quantity"), unit: data.get("unit") }); break;
      case "low-stock": await addLowStockToShopping(user, householdId, requestId); break;
      case "purchase": {
        const purchased = field(data, "purchased");
        if (purchased !== "yes" && purchased !== "no") throw new AccountError("El estado no es válido.");
        const id = field(data, "itemId");
        await setShoppingPurchased(user, householdId, requestId, id, data.get("revision"), purchased === "yes", data.has("quantity") ? data.get("quantity") : undefined);
        item = await getShoppingItem(user, householdId, id) ?? undefined;
        break;
      }
      case "edit": await editShoppingQuantity(user, householdId, requestId, field(data, "itemId"), data.get("revision"), data.get("quantity")); break;
      case "delete": await deleteShoppingItem(user, householdId, requestId, field(data, "itemId"), data.get("revision")); break;
      case "receive-batch": await receivePurchasedItems(user, householdId, requestId, data.get("items")); break;
      case "receive": await receiveShoppingItem(user, householdId, requestId, field(data, "itemId"), data.get("revision"), data.get("quantity")); break;
      default: throw new AccountError("Esta operación no es válida.");
    }
    revalidatePath("/", "layout");
    return { success: true, message: (kind === "receive" || kind === "receive-batch") ? "Recepción confirmada. Las existencias vinculadas se actualizaron una sola vez." : "Lista guardada y compartida con tu hogar.", ...(item ? { item } : {}) };
  } catch (error) {
    if (error instanceof AccountError || error instanceof HouseholdAccessError) return { success: false, message: error.message };
    console.error("Shopping operation unavailable");
    return { success: false, retryable: true, message: "No pudimos confirmar el cambio. Reintenta la misma operación; no se aplicará dos veces." };
  }
}

export async function searchShoppingProducts(householdId: string, query: string) {
  const user = await requireVerifiedUser();
  if (typeof query !== "string") return { products: [], message: "Escribe el nombre del producto." };
  try { return { products: await shoppingProductOptions(user, householdId, query), message: "" }; }
  catch (error) {
    if (error instanceof AccountError || error instanceof HouseholdAccessError) return { products: [], message: error.message };
    console.error("Shopping product lookup unavailable");
    return { products: [], message: "No pudimos buscar. Intenta de nuevo." };
  }
}
