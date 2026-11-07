"use server";

import { logAppError, withErrorReference, type ErrorOperation } from "@/lib/error-logging";
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

async function accountResult(name: ErrorOperation, operation: () => Promise<string>): Promise<AccountFormState> {
  try {
    return { success: true, message: await operation() };
  } catch (error) {
    if (error instanceof AccountError) return { success: false, message: withErrorReference(error.message, error) };
    const errorId = logAppError(name, error);
    return { success: false, message: withErrorReference("No pudimos completar la solicitud. Intenta de nuevo en unos minutos. Si te registraste, puedes solicitar otro correo de verificación.", error, errorId) };
  }
}

export async function registerAction(_state: AccountFormState, data: FormData) {
  return accountResult("account.register", () => registerAccount(data.get("name"), data.get("email"), data.get("password")));
}

export async function resendVerificationAction(_state: AccountFormState, data: FormData) {
  return accountResult("account.verification-request", () => requestAccountEmail(data.get("email"), "verification"));
}

export async function forgotPasswordAction(_state: AccountFormState, data: FormData) {
  return accountResult("account.reset-request", () => requestAccountEmail(data.get("email"), "reset"));
}

export async function verifyEmailAction(_state: AccountFormState, data: FormData) {
  const result = await accountResult("account.verify", () => verifyAccountEmail(data.get("token")));
  if (result.success) {
    revalidatePath("/", "layout");
    if ((await getCurrentUser())?.emailVerified) redirect("/inventory");
  }
  return result;
}

export async function updateNameAction(_state: AccountFormState, data: FormData) {
  const user = await requireSignedInUser();
  return accountResult("account.rename", async () => {
    const name = displayName(data.get("name"));
    await connectToDatabase();
    const result = await User.updateOne({ _id: user.id, sessionVersion: user.sessionVersion }, { $set: { name } });
    if (!result.matchedCount) throw new AccountError("Inicia sesión de nuevo para continuar.");
    revalidatePath("/", "layout");
    return "Nombre actualizado.";
  });
}

export async function resetPasswordAction(_state: AccountFormState, data: FormData) {
  return accountResult("account.reset-password", () => resetAccountPassword(data.get("token"), data.get("password")));
}

export async function createHouseholdAction(_state: AccountFormState, data: FormData) {
  const user = await requireVerifiedUser();
  const result = await accountResult("household.create", () => createHousehold(user.id, user.sessionVersion, data.get("name")));
  if (!result.success) return result;
  redirect("/inventory");
}
