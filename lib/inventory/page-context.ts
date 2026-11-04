import { redirect } from "next/navigation";
import { requireVerifiedUser } from "@/lib/auth/session";
import { ensureDefaultCategories } from "./default-categories";
import Membership from "@/models/Membership";

export async function inventoryPageContext() {
  const user = await requireVerifiedUser();
  const membership = await Membership.findOne({ userId: user.id }).lean();
  if (!membership) redirect("/household");
  const householdId = membership.householdId.toString();
  await ensureDefaultCategories(user, householdId);
  return { user, householdId };
}
