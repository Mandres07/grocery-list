"use server";

import { redirect } from "next/navigation";
import { registerAccount, requestAccountEmail, resetAccountPassword, verifyAccountEmail } from "@/lib/auth/accounts";
import { AccountError } from "@/lib/auth/validation";
import { getCurrentUser, requireSignedInUser, requireVerifiedUser } from "@/lib/auth/session";
import { displayName } from "@/lib/auth/validation";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { revalidatePath } from "next/cache";
import { createHousehold } from "@/lib/households/create";
import type { AccountFormState } from "@/lib/auth/form-state";

async function accountResult(operation: () => Promise<string>): Promise<AccountFormState> {
  try {
    return { success: true, message: await operation() };
  } catch (error) {
    if (error instanceof AccountError) return { success: false, message: error.message };
    console.error("Account operation unavailable");
    return { success: false, message: "No pudimos completar la solicitud. Intenta de nuevo en unos minutos. Si te registraste, puedes solicitar otro correo de verificación." };
  }
}

export async function registerAction(_state: AccountFormState, data: FormData) {
  return accountResult(() => registerAccount(data.get("name"), data.get("email"), data.get("password")));
}

export async function resendVerificationAction(_state: AccountFormState, data: FormData) {
  return accountResult(() => requestAccountEmail(data.get("email"), "verification"));
}

export async function forgotPasswordAction(_state: AccountFormState, data: FormData) {
  return accountResult(() => requestAccountEmail(data.get("email"), "reset"));
}

export async function verifyEmailAction(_state: AccountFormState, data: FormData) {
  const result = await accountResult(() => verifyAccountEmail(data.get("token")));
  if (result.success) {
    revalidatePath("/", "layout");
    if ((await getCurrentUser())?.emailVerified) redirect("/household");
  }
  return result;
}

export async function updateNameAction(_state: AccountFormState, data: FormData) {
  const user = await requireSignedInUser();
  return accountResult(async () => {
    const name = displayName(data.get("name"));
    await connectToDatabase();
    const result = await User.updateOne({ _id: user.id, sessionVersion: user.sessionVersion }, { $set: { name } });
    if (!result.matchedCount) throw new AccountError("Inicia sesión de nuevo para continuar.");
    revalidatePath("/", "layout");
    return "Nombre actualizado.";
  });
}

export async function resetPasswordAction(_state: AccountFormState, data: FormData) {
  return accountResult(() => resetAccountPassword(data.get("token"), data.get("password")));
}

export async function createHouseholdAction(_state: AccountFormState, data: FormData) {
  const user = await requireVerifiedUser();
  const result = await accountResult(() => createHousehold(user.id, user.sessionVersion, data.get("name")));
  if (!result.success) return result;
  redirect("/household");
}
