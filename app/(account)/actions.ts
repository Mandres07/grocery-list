"use server";

import { redirect } from "next/navigation";
import { registerAccount, requestAccountEmail, resetAccountPassword, verifyAccountEmail } from "@/lib/auth/accounts";
import { AccountError } from "@/lib/auth/validation";
import { requireVerifiedUser } from "@/lib/auth/session";
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
  return accountResult(() => verifyAccountEmail(data.get("token")));
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
