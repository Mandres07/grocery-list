import mongoose, { type ClientSession, type Types } from "mongoose";
import Category from "@/models/Category";
import Household from "@/models/Household";
import { lockHouseholdAccess, type HouseholdActor } from "@/lib/households/mutation-access";
import { requireInventoryReadAccess } from "./queries";

export const DEFAULT_CATEGORY_NAMES = [
  "Despensa", "Frutas y verduras", "Lácteos y huevos", "Carnes y pescados",
  "Congelados", "Bebidas", "Limpieza", "Cuidado personal",
] as const;

export async function seedDefaultCategories(householdId: Types.ObjectId, session: ClientSession) {
  for (const name of DEFAULT_CATEGORY_NAMES) {
    await Category.updateOne({ householdId, name, parentId: null }, {
      $setOnInsert: { householdId, name, parentId: null },
    }, { upsert: true, collation: { locale: "es", strength: 2 }, session });
  }
}

// The persistent marker preserves later renames/deletions and avoids reseeding.
export async function ensureDefaultCategories(actor: HouseholdActor, householdId: string) {
  await requireInventoryReadAccess(actor, householdId);
  if (await Household.exists({ _id: householdId, defaultCategoriesInitializedAt: { $ne: null } })) return;
  await mongoose.connection.transaction(async (session) => {
    const { household } = await lockHouseholdAccess(actor, householdId, session);
    if (household.defaultCategoriesInitializedAt) return;
    await seedDefaultCategories(household._id, session);
    await Household.updateOne({ _id: household._id }, { $set: { defaultCategoriesInitializedAt: new Date() } }, { session });
  });
}
