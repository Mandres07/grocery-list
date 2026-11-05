import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { displayName } from "@/lib/auth/validation";
import { lockHouseholdAccess, type HouseholdActor } from "./mutation-access";

export async function renameHousehold(actor: HouseholdActor, householdId: string, rawName: unknown) {
  const name = displayName(rawName);
  await connectToDatabase();
  await mongoose.connection.transaction(async (session) => {
    const { household } = await lockHouseholdAccess(actor, householdId, session, true);
    household.name = name;
    await household.save({ session });
  });
  return "Nombre del hogar actualizado.";
}
