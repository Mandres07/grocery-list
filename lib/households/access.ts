import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import Household from "@/models/Household";
import Membership from "@/models/Membership";

export class HouseholdAccessError extends Error {
  constructor() {
    super("No tienes permiso para acceder a este hogar.");
    this.name = "HouseholdAccessError";
  }
}

export function requireObjectId(value: string): Types.ObjectId {
  if (!/^[a-f\d]{24}$/i.test(value)) throw new HouseholdAccessError();
  return new Types.ObjectId(value);
}

// userId MUST come from a verified server session, never from the request body.
// Routes and Server Actions obtain that identity from requireVerifiedUser.
export async function requireHouseholdAccess(userId: string, householdId: string, ownerOnly = false) {
  const user = requireObjectId(userId);
  const household = requireObjectId(householdId);
  await connectToDatabase();

  const [record, membership] = await Promise.all([
    Household.findById(household).select("ownerId").lean(),
    Membership.exists({ householdId: household, userId: user }),
  ]);

  if (!record || !membership) throw new HouseholdAccessError();
  const role = record.ownerId.equals(user) ? "owner" : "member";
  if (ownerOnly && role !== "owner") throw new HouseholdAccessError();

  return { householdId: household, userId: user, role };
}
