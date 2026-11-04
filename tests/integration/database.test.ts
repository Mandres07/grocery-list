import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose, { Types } from "mongoose";
import { connectToDatabase, LOCAL_DATABASE_URI } from "@/lib/db";
import { User, Household, Membership, Invitation, Category, Product, StockMovement, initializeDatabase } from "@/models";
import { requireHouseholdAccess } from "@/lib/households/access";
import { requireProductInHousehold, validateCategoryParent } from "@/lib/inventory/references";

// Hard-code the local target and generate our own disposable database name.
// Never honor an Atlas URI or drop a user-configured database during verification.
const databaseName = `grocery_list_verify_${Date.now()}_${process.pid}`;
const ownerId = new Types.ObjectId();
const memberId = new Types.ObjectId();
const householdId = new Types.ObjectId();
const otherHouseholdId = new Types.ObjectId();

beforeAll(async () => {
  process.env.MONGODB_URI = LOCAL_DATABASE_URI;
  process.env.MONGODB_DB_NAME = databaseName;
  await connectToDatabase();
  await initializeDatabase();
  await User.create([{ _id: ownerId, name: "Owner", email: "owner@example.test" }, { _id: memberId, name: "Member", email: "member@example.test" }]);
  await Household.create({ _id: householdId, name: "Test home", ownerId });
  await Membership.create([{ householdId, userId: ownerId }, { householdId, userId: memberId }]);
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    await mongoose.disconnect();
    global.groceryDatabasePromise = undefined;
  }
});

describe("local database verification", () => {
  it("enforces unique membership and normalized emails in MongoDB", async () => {
    await expect(Membership.create({ householdId, userId: memberId })).rejects.toMatchObject({ code: 11000 });
    await expect(User.create({ name: "Duplicate", email: " OWNER@example.test " })).rejects.toMatchObject({ code: 11000 });
  });

  it("allows multiple non-Google users but rejects duplicate Google IDs", async () => {
    await User.create({ name: "Google", email: "google@example.test", googleId: "google-account" });
    await expect(User.create({ name: "Duplicate Google", email: "other@example.test", googleId: "google-account" })).rejects.toMatchObject({ code: 11000 });
  });

  it("enforces one pending invitation per household and email", async () => {
    const invitation = { householdId, invitedById: ownerId, email: "invite@example.test", expiresAt: new Date(Date.now() + 60000) };
    await Invitation.create({ ...invitation, tokenHash: "a".repeat(64) });
    await expect(Invitation.create({ ...invitation, tokenHash: "b".repeat(64) })).rejects.toMatchObject({ code: 11000 });
    await Invitation.updateOne({ householdId, email: invitation.email }, { status: "revoked" });
    await expect(Invitation.create({ ...invitation, tokenHash: "c".repeat(64) })).resolves.toBeDefined();
  });

  it("enforces stock request deduplication within each household", async () => {
    const movement = { householdId, productId: new Types.ObjectId(), actorId: ownerId, delta: 1, reason: "receipt" as const, requestId: "same-request" };
    await StockMovement.create(movement);
    await expect(StockMovement.create(movement)).rejects.toMatchObject({ code: 11000 });
    await expect(StockMovement.create({ ...movement, householdId: otherHouseholdId })).resolves.toBeDefined();
  });

  it("rolls back all writes in a failed transaction", async () => {
    const productId = new Types.ObjectId();
    await expect(mongoose.connection.transaction(async (session) => {
      await Product.create([{ _id: productId, householdId, name: "Rollback product" }], { session });
      throw new Error("Deliberate rollback");
    })).rejects.toThrow("Deliberate rollback");
    expect(await Product.exists({ _id: productId })).toBeNull();
  });

  it("isolates product and category references between households and rejects cycles", async () => {
    const product = await Product.create({ householdId, name: "Private product" });
    await expect(requireProductInHousehold(otherHouseholdId, product._id)).rejects.toThrow("no pertenece");
    const root = await Category.create({ householdId, name: "Food" });
    const child = await Category.create({ householdId, name: "Pantry", parentId: root._id });
    await expect(validateCategoryParent(householdId, root._id, child._id)).rejects.toThrow("ciclo");
    await expect(validateCategoryParent(otherHouseholdId, new Types.ObjectId(), root._id)).rejects.toThrow("no pertenece");
    await expect(validateCategoryParent(householdId, new Types.ObjectId(), child._id)).resolves.toBeUndefined();
  });

  it("blocks a removed member on their next access check", async () => {
    await expect(requireHouseholdAccess(memberId.toString(), householdId.toString())).resolves.toMatchObject({ role: "member" });
    await expect(requireHouseholdAccess(memberId.toString(), householdId.toString(), true)).rejects.toThrow("No tienes permiso");
    await expect(requireHouseholdAccess(ownerId.toString(), householdId.toString(), true)).resolves.toMatchObject({ role: "owner" });
    await Membership.deleteOne({ householdId, userId: memberId });
    await expect(requireHouseholdAccess(memberId.toString(), householdId.toString())).rejects.toThrow("No tienes permiso");
  });
});
