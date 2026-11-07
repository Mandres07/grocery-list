"use server";

import { logAppError, withErrorReference } from "@/lib/error-logging";
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/session";
import { AccountError } from "@/lib/auth/validation";
import type { AccountFormState } from "@/lib/auth/form-state";
import { HouseholdAccessError } from "@/lib/households/access";
import { renameHousehold } from "@/lib/households/update";

export async function renameHouseholdAction(_state: AccountFormState, data: FormData): Promise<AccountFormState> {
  const user = await requireVerifiedUser();
  try {
    const householdId = data.get("householdId");
    if (typeof householdId !== "string") throw new AccountError("Actualiza la página y vuelve a intentar.");
    const message = await renameHousehold(user, householdId, data.get("name"));
    revalidatePath("/", "layout");
    return { success: true, message };
  } catch (error) {
    if (error instanceof AccountError || error instanceof HouseholdAccessError) return { success: false, message: withErrorReference(error.message, error) };
    const errorId = logAppError("household.rename", error);
    return { success: false, message: withErrorReference("No pudimos guardar el nombre del hogar. Intenta de nuevo en unos minutos.", error, errorId) };
  }
}
