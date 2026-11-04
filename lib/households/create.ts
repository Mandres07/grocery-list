import mongoose from "mongoose";
import User from "@/models/User";
import Household from "@/models/Household";
import Membership from "@/models/Membership";
import { connectToDatabase } from "@/lib/db";
import { AccountError, displayName } from "@/lib/auth/validation";
import { requireObjectId } from "./access";

// The caller obtains identity from requireVerifiedUser, never from form fields.
export async function createHousehold(userId: string, sessionVersion: number, rawName: unknown) {
  const name = displayName(rawName);
  const user = requireObjectId(userId);
  await connectToDatabase();
  return mongoose.connection.transaction(async (session) => {
    // Serialize onboarding on the user document so concurrent requests cannot
    // create multiple households. Password reset conflicts with this write too.
    const current = await User.findOneAndUpdate({ _id: user, emailVerifiedAt: { $ne: null }, sessionVersion }, {
      $inc: { householdRevision: 1 },
    }, { session });
    if (!current) throw new AccountError("Inicia sesión de nuevo para crear tu hogar.");
    const existing = await Membership.exists({ userId: user }).session(session);
    if (existing) throw new AccountError("Ya perteneces a un hogar. Actualiza la página para verlo.");
    const [household] = await Household.create([{ name, ownerId: user }], { session });
    await Membership.create([{ householdId: household._id, userId: user }], { session });
    return household._id.toString();
  });
}
