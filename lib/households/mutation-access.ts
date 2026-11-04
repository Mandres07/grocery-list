import type { ClientSession } from "mongoose";
import User from "@/models/User";
import Household from "@/models/Household";
import Membership from "@/models/Membership";
import { AccountError } from "@/lib/auth/validation";
import { HouseholdAccessError, requireObjectId } from "./access";

export interface HouseholdActor { id: string; sessionVersion: number }

export async function lockVerifiedUser(actor: HouseholdActor, session: ClientSession) {
  const user = await User.findOneAndUpdate({ _id: requireObjectId(actor.id), sessionVersion: actor.sessionVersion, emailVerifiedAt: { $ne: null } }, {
    $inc: { householdRevision: 1 },
  }, { session });
  if (!user) throw new AccountError("Inicia sesión de nuevo y verifica tu correo para continuar.");
  return user;
}

// Household writes serialize against member removal and category graph changes.
// This favors consistent permissions over parallel writes within a small home.
export async function lockHouseholdAccess(actor: HouseholdActor, householdId: string, session: ClientSession, ownerOnly = false) {
  const user = await lockVerifiedUser(actor, session);
  const household = await Household.findOneAndUpdate({ _id: requireObjectId(householdId), ...(ownerOnly ? { ownerId: user._id } : {}) }, {
    $inc: { accessRevision: 1 },
  }, { session });
  if (!household || !await Membership.exists({ userId: user._id, householdId: household._id }).session(session)) throw new HouseholdAccessError();
  return { user, household };
}
