"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/session";
import { AccountError, validToken } from "@/lib/auth/validation";
import { HouseholdAccessError } from "@/lib/households/access";
import { acceptFamilyInvitation, getFamilyInvitation, inviteFamilyMember, removeFamilyMember, revokeFamilyInvitation } from "@/lib/households/family";
import { INVITATION_COOKIE } from "@/lib/households/invitation-context";
import type { AccountFormState } from "@/lib/auth/form-state";

function field(data: FormData, name: string) {
  const value = data.get(name);
  if (typeof value !== "string") throw new AccountError("Faltan datos. Actualiza la página y vuelve a intentar.");
  return value;
}

async function familyResult(operation: () => Promise<string>): Promise<AccountFormState> {
  try {
    const message = await operation();
    revalidatePath("/family");
    revalidatePath("/household");
    revalidatePath("/invitation");
    return { success: true, message };
  } catch (error) {
    if (error instanceof AccountError || error instanceof HouseholdAccessError) return { success: false, message: error.message };
    console.error("Family operation unavailable");
    return { success: false, message: "No pudimos completar la solicitud. Revisa tu conexión e intenta de nuevo." };
  }
}

export async function inviteMemberAction(_state: AccountFormState, data: FormData) {
  const user = await requireVerifiedUser();
  return familyResult(() => inviteFamilyMember(user, field(data, "householdId"), data.get("email")));
}

export async function resendInvitationAction(_state: AccountFormState, data: FormData) {
  const user = await requireVerifiedUser();
  return familyResult(() => inviteFamilyMember(user, field(data, "householdId"), data.get("email"), field(data, "invitationId")));
}

export async function revokeInvitationAction(_state: AccountFormState, data: FormData) {
  const user = await requireVerifiedUser();
  return familyResult(() => revokeFamilyInvitation(user, field(data, "householdId"), field(data, "invitationId")));
}

export async function removeMemberAction(_state: AccountFormState, data: FormData) {
  const user = await requireVerifiedUser();
  return familyResult(() => removeFamilyMember(user, field(data, "householdId"), field(data, "memberId")));
}

export async function acceptInvitationAction(_state: AccountFormState, data: FormData) {
  const user = await requireVerifiedUser();
  const result = await familyResult(() => acceptFamilyInvitation(user, data.get("token")));
  if (!result.success) return result;
  (await cookies()).delete(INVITATION_COOKIE);
  redirect("/inventory");
}

export async function continueInvitationAction(data: FormData) {
  const token = data.get("token");
  if (!validToken(token)) redirect("/invitation");
  const invitation = await getFamilyInvitation(token);
  if (invitation?.status !== "pending") redirect("/invitation");
  (await cookies()).set(INVITATION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 24 * 60 * 60,
  });
  redirect(data.get("destination") === "register" ? "/register" : "/sign-in");
}
