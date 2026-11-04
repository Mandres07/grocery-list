import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { User, Household, Membership, Invitation, Category, Product, StockMovement, ShoppingItem } from "@/models";

const id = () => new Types.ObjectId();

describe("inventory validation", () => {
  it.each([-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])("rejects invalid stock %s", async (quantity) => {
    await expect(new Product({ householdId: id(), name: "Arroz", quantity }).validate()).rejects.toThrow();
  });

  it("accepts zero stock and an optional low-stock threshold", async () => {
    const product = new Product({ householdId: id(), name: " Arroz ", quantity: 0 });
    await expect(product.validate()).resolves.toBeUndefined();
    expect(product.name).toBe("Arroz");
    expect(product.lowStockThreshold).toBeNull();
  });

  it.each([-1, 0.25])("rejects invalid threshold %s", async (lowStockThreshold) => {
    await expect(new Product({ householdId: id(), name: "Arroz", lowStockThreshold }).validate()).rejects.toThrow();
  });

  it.each([0, -1, 1.5])("rejects shopping quantity %s", async (quantity) => {
    await expect(new ShoppingItem({ householdId: id(), addedById: id(), name: "Leche", quantity }).validate()).rejects.toThrow();
  });

  it.each([0, 0.5, Infinity])("rejects invalid stock delta %s", async (delta) => {
    await expect(new StockMovement({ householdId: id(), productId: id(), actorId: id(), requestId: "request", reason: "correction", delta }).validate()).rejects.toThrow();
  });

  it("allows positive and negative whole-number movements", async () => {
    for (const delta of [-2, 3]) {
      await expect(new StockMovement({ householdId: id(), productId: id(), actorId: id(), requestId: "request", reason: "correction", delta }).validate()).resolves.toBeUndefined();
    }
  });

  it("requires a household on every shared record", async () => {
    const documents = [
      new Membership({ userId: id() }),
      new Invitation({ invitedById: id(), email: "family@example.com", tokenHash: "a".repeat(64), expiresAt: new Date() }),
      new Category({ name: "Despensa" }),
      new Product({ name: "Arroz" }),
      new StockMovement({ productId: id(), actorId: id(), delta: 1, reason: "receipt", requestId: "request" }),
      new ShoppingItem({ name: "Leche", addedById: id() }),
    ];
    for (const document of documents) {
      await expect(document.validate()).rejects.toHaveProperty("errors.householdId");
    }
  });
});

describe("identity and invitation validation", () => {
  it("normalizes emails and excludes secrets from default selection", async () => {
    const user = new User({ name: "Mario", email: " Mario@Example.com " });
    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.email).toBe("mario@example.com");
    expect(User.schema.path("passwordHash").options.select).toBe(false);
    expect(Invitation.schema.path("tokenHash").options.select).toBe(false);
  });

  it("rejects malformed emails", async () => {
    await expect(new User({ name: "Mario", email: "invalid" }).validate()).rejects.toThrow();
  });

  it("requires a single owner reference", async () => {
    await expect(new Household({ name: "Mi hogar" }).validate()).rejects.toThrow();
    await expect(new Household({ name: "Mi hogar", ownerId: id() }).validate()).resolves.toBeUndefined();
  });

  it("rejects plaintext invitation tokens and unknown states", async () => {
    const invitation = { householdId: id(), invitedById: id(), email: "family@example.com", expiresAt: new Date() };
    await expect(new Invitation({ ...invitation, tokenHash: "plaintext-token" }).validate()).rejects.toThrow();
    await expect(new Invitation({ ...invitation, tokenHash: "a".repeat(64), status: "unknown" }).validate()).rejects.toThrow();
    await expect(new Invitation({ ...invitation, tokenHash: "a".repeat(64) }).validate()).resolves.toBeUndefined();
  });

  it("rejects unexpected role fields rather than trusting client permissions", () => {
    expect(() => new Membership({ householdId: id(), userId: id(), role: "owner" })).toThrow();
  });
});
