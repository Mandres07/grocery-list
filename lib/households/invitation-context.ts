import { cookies } from "next/headers";
import { validToken } from "@/lib/auth/validation";

export const INVITATION_COOKIE = "grocery.invitation";

export async function pendingInvitationToken() {
  const token = (await cookies()).get(INVITATION_COOKIE)?.value;
  return validToken(token) ? token : undefined;
}
