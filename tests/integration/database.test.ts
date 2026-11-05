import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { connectToDatabase, LOCAL_DATABASE_URI } from "@/lib/db";
import { User, Household, Membership, Invitation, Category, Product, StockMovement, ShoppingItem, initializeDatabase } from "@/models";
import { requireHouseholdAccess } from "@/lib/households/access";
import { requireProductInHousehold, validateCategoryParent } from "@/lib/inventory/references";
import { authenticateAccount, registerAccount, requestAccountEmail, resetAccountPassword, tokenHash, verifyAccountEmail } from "@/lib/auth/accounts";
import { DEFAULT_CATEGORY_NAMES, ensureDefaultCategories } from "@/lib/inventory/default-categories";
import { createHousehold } from "@/lib/households/create";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { sendAccountEmail, sendInvitationEmail } from "@/lib/email/account-email";
import { acceptFamilyInvitation, getFamilyInvitation, inviteFamilyMember, removeFamilyMember, revokeFamilyInvitation, type FamilyActor } from "@/lib/households/family";
import { createProduct, editProduct, adjustStock, correctStock, setProductArchived, undoStockMovement, saveCategory, deleteCategory } from "@/lib/inventory/mutations";
import { getInventoryProduct, listInventory, listInventoryActivity } from "@/lib/inventory/queries";
import InventoryRequest from "@/models/InventoryRequest";
import { randomUUID } from "node:crypto";
import { addShoppingItem, addLowStockToShopping, setShoppingPurchased, editShoppingQuantity, deleteShoppingItem, receiveShoppingItem, receivePurchasedItems } from "@/lib/shopping/mutations";
import { getShoppingItem, listShoppingItems, shoppingProductOptions } from "@/lib/shopping/queries";

vi.mock("@/lib/email/account-email", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/email/account-email")>(),
  sendAccountEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Hard-code the local target and generate our own disposable database name.
// Never honor an Atlas URI or drop a user-configured database during verification.
async function purchasedReceiptItems(actor: FamilyActor, householdId: string) {
  return (await listShoppingItems(actor, householdId, "purchased")).receiptItems;
}

const databaseName = `grocery_list_verify_${Date.now()}_${process.pid}`;
const ownerId = new Types.ObjectId();
const memberId = new Types.ObjectId();
const householdId = new Types.ObjectId();
const otherHouseholdId = new Types.ObjectId();

beforeAll(async () => {
  process.env.MONGODB_URI = LOCAL_DATABASE_URI;
  process.env.MONGODB_DB_NAME = databaseName;
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3001");
  vi.stubEnv("RESEND_API_KEY", "integration-test-not-a-real-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Lista de Compras <test@example.test>");
  await connectToDatabase();
  await initializeDatabase();
  await User.create([{ _id: ownerId, name: "Owner", email: "owner@example.test" }, { _id: memberId, name: "Member", email: "member@example.test" }]);
  await Household.create({ _id: householdId, name: "Test home", ownerId });
  await Membership.create([{ householdId, userId: ownerId }, { householdId, userId: memberId }]);
});

describe("family invitation and permission workflows", () => {
  let owner: FamilyActor;
  let home: string;
  let sequence = 0;

  async function person() {
    const email = `family-${++sequence}@example.test`;
    const user = await User.create({ name: "Persona de prueba", email, emailVerifiedAt: new Date() });
    return { id: user._id.toString(), sessionVersion: 0, email };
  }

  function deliveredToken(email: string) {
    return vi.mocked(sendInvitationEmail).mock.calls.filter((call) => call[0] === email).at(-1)![1];
  }

  beforeEach(async () => {
    owner = await person();
    home = await createHousehold(owner.id, 0, "Hogar familiar");
  });

  it("invites someone without an account and stores only a hash", async () => {
    const email = "not-registered@example.test";
    await inviteFamilyMember(owner, home, email);
    expect(await User.exists({ email })).toBeNull();
    const token = deliveredToken(email);
    const invitation = await Invitation.findOne({ householdId: home, email }).select("+tokenHash");
    expect(invitation!.tokenHash).toBe(tokenHash(token));
    expect(invitation!.tokenHash).not.toBe(token);
    expect(invitation!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60_000);
    expect(await getFamilyInvitation(token)).toMatchObject({ status: "pending", householdName: "Hogar familiar", email });
  });

  it("prevents duplicate pending invitations during concurrent sends", async () => {
    const email = "concurrent-invite@example.test";
    const outcomes = await Promise.allSettled([inviteFamilyMember(owner, home, email), inviteFamilyMember(owner, home, email)]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(await Invitation.countDocuments({ householdId: home, email, status: "pending" })).toBe(1);
  });

  it("accepts once, including for an account created after the invitation", async () => {
    const email = "new-account-invite@example.test";
    await inviteFamilyMember(owner, home, email);
    const user = await User.create({ name: "Nueva", email, emailVerifiedAt: new Date() });
    const recipient = { id: user._id.toString(), sessionVersion: 0 };
    const token = deliveredToken(email);
    const outcomes = await Promise.allSettled([acceptFamilyInvitation(recipient, token), acceptFamilyInvitation(recipient, token)]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(await Membership.countDocuments({ userId: user._id })).toBe(1);
    await expect(requireHouseholdAccess(recipient.id, home)).resolves.toMatchObject({ role: "member" });
    await expect(requireHouseholdAccess(recipient.id, home, true)).rejects.toThrow("permiso");
    await expect(acceptFamilyInvitation(recipient, token)).rejects.toThrow("no está disponible");
  });

  it("binds invitations to a verified recipient and rejects stale sessions", async () => {
    const recipient = await person();
    const other = await person();
    await inviteFamilyMember(owner, home, recipient.email);
    const token = deliveredToken(recipient.email);
    await expect(acceptFamilyInvitation(other, token)).rejects.toThrow("otro correo");
    await User.updateOne({ _id: recipient.id }, { emailVerifiedAt: null });
    await expect(acceptFamilyInvitation(recipient, token)).rejects.toThrow("Inicia sesión");
    await User.updateOne({ _id: recipient.id }, { emailVerifiedAt: new Date(), sessionVersion: 1 });
    await expect(acceptFamilyInvitation(recipient, token)).rejects.toThrow("Inicia sesión");
    expect(await Membership.exists({ userId: recipient.id })).toBeNull();
  });

  it("enforces owner-only actions and prevents cross-household mutations", async () => {
    const outsider = await person();
    const recipient = await person();
    await inviteFamilyMember(owner, home, recipient.email);
    const invitation = await Invitation.findOne({ householdId: home, email: recipient.email });
    await acceptFamilyInvitation(recipient, deliveredToken(recipient.email));
    await expect(inviteFamilyMember(recipient, home, outsider.email)).rejects.toThrow("permiso");
    await expect(revokeFamilyInvitation(outsider, home, invitation!._id.toString())).rejects.toThrow("permiso");
    await expect(removeFamilyMember(recipient, home, owner.id)).rejects.toThrow("permiso");
    const otherHome = await createHousehold(outsider.id, 0, "Otro hogar");
    await expect(revokeFamilyInvitation(outsider, otherHome, invitation!._id.toString())).rejects.toThrow("ya no se puede");
    await expect(removeFamilyMember(outsider, otherHome, recipient.id)).rejects.toThrow("ya no pertenece");
    expect(await Membership.exists({ householdId: home, userId: recipient.id })).not.toBeNull();
  });

  it("enforces resend cooldown and invalidates the previous link", async () => {
    const recipient = await person();
    await inviteFamilyMember(owner, home, recipient.email);
    const token = deliveredToken(recipient.email);
    const invitation = await Invitation.findOne({ householdId: home, email: recipient.email });
    const invitationId = invitation!._id.toString();
    await expect(inviteFamilyMember(owner, home, recipient.email, invitationId)).rejects.toThrow("Espera un minuto");
    await Invitation.updateOne({ _id: invitationId }, { sentAt: new Date(Date.now() - 61_000) });
    await inviteFamilyMember(owner, home, recipient.email, invitationId);
    await expect(acceptFamilyInvitation(recipient, token)).rejects.toThrow("no está disponible");
    await expect(acceptFamilyInvitation(recipient, deliveredToken(recipient.email))).resolves.toContain("formas parte");
  });

  it("rejects expired and revoked links and allows a new invitation", async () => {
    const recipient = await person();
    await inviteFamilyMember(owner, home, recipient.email);
    const oldToken = deliveredToken(recipient.email);
    await Invitation.updateOne({ householdId: home, email: recipient.email, status: "pending" }, { expiresAt: new Date(Date.now() - 1000) });
    expect(await getFamilyInvitation(oldToken)).toMatchObject({ status: "expired" });
    await expect(acceptFamilyInvitation(recipient, oldToken)).rejects.toThrow("no está disponible");
    await inviteFamilyMember(owner, home, recipient.email);
    const newToken = deliveredToken(recipient.email);
    const invitation = await Invitation.findOne({ householdId: home, email: recipient.email, status: "pending" });
    await revokeFamilyInvitation(owner, home, invitation!._id.toString());
    await expect(acceptFamilyInvitation(recipient, newToken)).rejects.toThrow("no está disponible");
    expect(await Membership.exists({ userId: recipient.id })).toBeNull();
  });

  it("removes access without deleting inventory or activity, then allows reinvitation", async () => {
    const recipient = await person();
    await inviteFamilyMember(owner, home, recipient.email);
    const oldToken = deliveredToken(recipient.email);
    await acceptFamilyInvitation(recipient, oldToken);
    const product = await Product.create({ householdId: home, name: "Producto compartido" });
    const movement = await StockMovement.create({ householdId: home, productId: product._id, actorId: recipient.id, delta: 1, reason: "receipt", requestId: `family-${home}` });
    await removeFamilyMember(owner, home, recipient.id);
    await expect(requireHouseholdAccess(recipient.id, home)).rejects.toThrow("permiso");
    expect(await Product.exists({ _id: product._id })).not.toBeNull();
    expect(await StockMovement.exists({ _id: movement._id })).not.toBeNull();
    await expect(acceptFamilyInvitation(recipient, oldToken)).rejects.toThrow("no está disponible");
    await inviteFamilyMember(owner, home, recipient.email);
    await acceptFamilyInvitation(recipient, deliveredToken(recipient.email));
    expect(await Membership.countDocuments({ userId: recipient.id })).toBe(1);
  });

  it("does not allow owner removal or inviting existing members", async () => {
    const user = await User.findById(owner.id);
    await expect(removeFamilyMember(owner, home, owner.id)).rejects.toThrow("propietaria");
    await expect(inviteFamilyMember(owner, home, user!.email)).rejects.toThrow("Ya eres parte");
    const recipient = await person();
    await inviteFamilyMember(owner, home, recipient.email);
    await acceptFamilyInvitation(recipient, deliveredToken(recipient.email));
    await expect(inviteFamilyMember(owner, home, recipient.email)).rejects.toThrow("ya pertenece");
  });

  it("invalidates an undelivered invitation and permits another send", async () => {
    const recipient = await person();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendInvitationEmail).mockRejectedValueOnce(new Error("Provider unavailable"));
    try {
      await expect(inviteFamilyMember(owner, home, recipient.email)).rejects.toThrow("No pudimos enviar");
      await expect(acceptFamilyInvitation(recipient, deliveredToken(recipient.email))).rejects.toThrow("no está disponible");
      await inviteFamilyMember(owner, home, recipient.email);
      await expect(acceptFamilyInvitation(recipient, deliveredToken(recipient.email))).resolves.toBeDefined();
    } finally { log.mockRestore(); }
  });

  it("prevents concurrent acceptance into two different households", async () => {
    const recipient = await person();
    const secondOwner = await person();
    const secondHome = await createHousehold(secondOwner.id, 0, "Segundo hogar");
    await inviteFamilyMember(owner, home, recipient.email);
    const firstToken = deliveredToken(recipient.email);
    await inviteFamilyMember(secondOwner, secondHome, recipient.email);
    const secondToken = deliveredToken(recipient.email);
    const outcomes = await Promise.allSettled([acceptFamilyInvitation(recipient, firstToken), acceptFamilyInvitation(recipient, secondToken)]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(await Membership.countDocuments({ userId: recipient.id })).toBe(1);
  });

  it("rolls back token consumption if membership creation fails", async () => {
    const recipient = await person();
    await inviteFamilyMember(owner, home, recipient.email);
    const token = deliveredToken(recipient.email);
    const insert = vi.spyOn(Membership, "create").mockRejectedValueOnce(new Error("Membership insert failed"));
    try {
      await expect(acceptFamilyInvitation(recipient, token)).rejects.toThrow("insert failed");
      expect(await getFamilyInvitation(token)).toMatchObject({ status: "pending" });
      expect(await Membership.exists({ userId: recipient.id })).toBeNull();
    } finally { insert.mockRestore(); }
    await expect(acceptFamilyInvitation(recipient, token)).resolves.toBeDefined();
  });

  it("serializes acceptance against revocation", async () => {
    const recipient = await person();
    await inviteFamilyMember(owner, home, recipient.email);
    const token = deliveredToken(recipient.email);
    const invitation = await Invitation.findOne({ householdId: home, email: recipient.email });
    const outcomes = await Promise.allSettled([
      acceptFamilyInvitation(recipient, token), revokeFamilyInvitation(owner, home, invitation!._id.toString()),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const current = await Invitation.findById(invitation!._id);
    expect(["accepted", "revoked"]).toContain(current!.status);
    expect(Boolean(await Membership.exists({ userId: recipient.id }))).toBe(current!.status === "accepted");
  });
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    await mongoose.disconnect();
    global.groceryDatabasePromise = undefined;
    vi.unstubAllEnvs();
  }
});

describe("account and household workflows", () => {
  const email = "account@example.test";
  const password = "a memorable password";
  let verificationToken: string;
  let accountId: string;

  it("registers without creating a household and stores only a token hash", async () => {
    await registerAccount("Ana", " Account@Example.test ", password);
    const user = await User.findOne({ email }).select("+passwordHash +verificationTokenHash");
    expect(user).not.toBeNull();
    accountId = user!._id.toString();
    expect(await Membership.exists({ userId: accountId })).toBeNull();
    expect(await Household.exists({ ownerId: accountId })).toBeNull();
    expect(user!.passwordHash).not.toContain(password);
    const call = vi.mocked(sendAccountEmail).mock.calls.at(-1)!;
    verificationToken = call[1];
    expect(call[0]).toBe(email);
    expect(user!.verificationTokenHash).toBe(tokenHash(verificationToken));
    expect(user!.verificationTokenHash).not.toBe(verificationToken);
    expect(await authenticateAccount(email, password)).toMatchObject({ id: accountId });
    await expect(createHousehold(accountId, 0, "Unverified home")).rejects.toThrow("Inicia sesión");
  });

  it("does not replace credentials on duplicate signup or send again during cooldown", async () => {
    const calls = vi.mocked(sendAccountEmail).mock.calls.length;
    await registerAccount("Another person", email, "different password");
    expect(vi.mocked(sendAccountEmail).mock.calls.length).toBe(calls);
    expect((await User.findById(accountId))!.name).toBe("Ana");
  });

  it("consumes verification once even with concurrent confirmation requests", async () => {
    const results = await Promise.allSettled([verifyAccountEmail(verificationToken), verifyAccountEmail(verificationToken)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await authenticateAccount(email, "different password")).toBeNull();
    expect(await authenticateAccount(email, password)).toMatchObject({ id: accountId, sessionVersion: 0 });
    await expect(verifyAccountEmail(verificationToken)).rejects.toThrow("ya fue usado");
  });

  it("creates one owner household atomically during concurrent requests", async () => {
    const outcomes = await Promise.allSettled([
      createHousehold(accountId, 0, "Mi hogar"), createHousehold(accountId, 0, "Otro hogar"),
    ]);
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await Household.countDocuments({ ownerId: accountId })).toBe(1);
    expect(await Membership.countDocuments({ userId: accountId })).toBe(1);
    const membership = await Membership.findOne({ userId: accountId });
    await expect(requireHouseholdAccess(accountId, membership!.householdId.toString(), true)).resolves.toMatchObject({ role: "owner" });
  });

  it("denies household creation by unverified users and rolls back a failed membership insert", async () => {
    const user = await User.create({ name: "Unverified", email: "unverified@example.test" });
    await expect(createHousehold(user._id.toString(), 0, "Forbidden")).rejects.toThrow("Inicia sesión");
    expect(await Household.exists({ ownerId: user._id })).toBeNull();
    await User.updateOne({ _id: user._id }, { emailVerifiedAt: new Date() });
    const insert = vi.spyOn(Membership, "create").mockRejectedValueOnce(new Error("Deliberate membership failure"));
    try {
      await expect(createHousehold(user._id.toString(), 0, "Rollback")).rejects.toThrow("Deliberate");
      expect(await Household.exists({ ownerId: user._id })).toBeNull();
    } finally { insert.mockRestore(); }
  });

  it("uses the same recovery response for unknown and known accounts", async () => {
    const unknown = await requestAccountEmail("missing@example.test", "reset");
    const known = await requestAccountEmail(email, "reset");
    expect(known).toBe(unknown);
    const token = vi.mocked(sendAccountEmail).mock.calls.at(-1)![1];
    const results = await Promise.allSettled([resetAccountPassword(token, "my replacement password"), resetAccountPassword(token, "other replacement password")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await User.findById(accountId).select("+sessionVersion"))!.sessionVersion).toBe(1);
    expect(await authenticateAccount(email, password)).toBeNull();
    await expect(resetAccountPassword(token, "yet another password")).rejects.toThrow("ya fue usado");
    await expect(createHousehold(accountId, 0, "Stale session")).rejects.toThrow("Inicia sesión");
  });

  it("rejects expired verification and reset links even before database cleanup", async () => {
    const token = "d".repeat(64);
    const user = await User.create({ name: "Expired", email: "expired@example.test", verificationTokenHash: tokenHash(token), verificationExpiresAt: new Date(Date.now() - 1000) });
    await expect(verifyAccountEmail(token)).rejects.toThrow("venció");
    await User.updateOne({ _id: user._id }, { emailVerifiedAt: new Date(), resetTokenHash: tokenHash(token), resetExpiresAt: new Date(Date.now() - 1000) });
    await expect(resetAccountPassword(token, "replacement password")).rejects.toThrow("venció");
  });

  it("recovers after a failed email send and invalidates the undelivered token", async () => {
    vi.mocked(sendAccountEmail).mockRejectedValueOnce(new Error("Email unavailable"));
    await expect(registerAccount("Retry", "retry@example.test", password)).resolves.toContain("No pudimos enviar");
    expect(await authenticateAccount("retry@example.test", password)).not.toBeNull();
    const failedToken = vi.mocked(sendAccountEmail).mock.calls.at(-1)![1];
    await expect(verifyAccountEmail(failedToken)).rejects.toThrow("no es válido");
    await requestAccountEmail("retry@example.test", "verification");
    const newToken = vi.mocked(sendAccountEmail).mock.calls.at(-1)![1];
    expect(newToken).not.toBe(failedToken);
    await expect(verifyAccountEmail(newToken)).resolves.toContain("verificado");
  });

  it("enforces a shared atomic attempt budget under concurrent requests", async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => consumeRateLimit("test:concurrent", 3, 60_000)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(5);
  });

  it("replaces earlier verification links on resend after the cooldown", async () => {
    const email = "resend@example.test";
    await registerAccount("Resend", email, password);
    const oldToken = vi.mocked(sendAccountEmail).mock.calls.at(-1)![1];
    await User.updateOne({ email }, { verificationSentAt: new Date(Date.now() - 61_000) });
    await requestAccountEmail(email, "verification");
    const newToken = vi.mocked(sendAccountEmail).mock.calls.at(-1)![1];
    await expect(verifyAccountEmail(oldToken)).rejects.toThrow("no es válido");
    await expect(verifyAccountEmail(newToken)).resolves.toContain("verificado");
  });

  it("allows account access without email configuration while withholding household access", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    try {
      await expect(registerAccount("No key", "no-key@example.test", password)).resolves.toContain("No pudimos enviar");
      const user = await authenticateAccount("no-key@example.test", password);
      expect(user).not.toBeNull();
      await expect(createHousehold(user!.id, 0, "Not yet")).rejects.toThrow("Inicia sesión");
    } finally { vi.stubEnv("RESEND_API_KEY", "integration-test-not-a-real-key"); }
  });

  it("recovers an unverified account without granting verified household access", async () => {
    const email = "pending-recovery@example.test";
    await registerAccount("Pending", email, password);
    await requestAccountEmail(email, "reset");
    const token = vi.mocked(sendAccountEmail).mock.calls.at(-1)![1];
    await resetAccountPassword(token, "new pending password");
    const user = await authenticateAccount(email, "new pending password");
    expect(user).toMatchObject({ sessionVersion: 1 });
    expect((await User.findById(user!.id))!.emailVerifiedAt).toBeNull();
    expect(await authenticateAccount(email, password)).toBeNull();
    await expect(createHousehold(user!.id, 1, "Not verified yet")).rejects.toThrow("Inicia sesión");
  });
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

describe("shared inventory workflows", () => {
  let owner: FamilyActor;
  let member: FamilyActor;
  let home: string;
  let otherHome: string;
  let outsider: FamilyActor;
  let productId: string;
  let sequence = 0;
  const input = { name: "Arroz", unit: "bolsas", categoryId: null, quantity: "2", lowStockThreshold: "1" };

  async function person() {
    const user = await User.create({ name: `Inventario ${++sequence}`, email: `inventory-${sequence}@example.test`, emailVerifiedAt: new Date() });
    return { id: user._id.toString(), sessionVersion: 0 };
  }

  beforeEach(async () => {
    owner = await person();
    member = await person();
    outsider = await person();
    home = await createHousehold(owner.id, 0, "Inventario compartido");
    otherHome = await createHousehold(outsider.id, 0, "Hogar privado");
    await Membership.create({ householdId: home, userId: member.id });
    productId = (await createProduct(owner, home, randomUUID(), input)).id;
  });

  it("creates basic categories atomically with each new household", async () => {
    expect((await Category.find({ householdId: home }).lean()).map((item) => item.name).sort()).toEqual([...DEFAULT_CATEGORY_NAMES].sort());
    expect((await Household.findById(home))!.defaultCategoriesInitializedAt).toBeInstanceOf(Date);
  });

  it("backfills legacy homes once while preserving existing category IDs and inventory", async () => {
    await Category.deleteMany({ householdId: home });
    await Household.updateOne({ _id: home }, { $unset: { defaultCategoriesInitializedAt: 1 } });
    const existing = await Category.create({ householdId: home, name: "despensa", parentId: null });
    await Promise.all([ensureDefaultCategories(owner, home), ensureDefaultCategories(member, home)]);
    expect(await Category.countDocuments({ householdId: home })).toBe(DEFAULT_CATEGORY_NAMES.length);
    expect((await Category.findById(existing._id))!.name).toBe("despensa");
    expect(await Product.countDocuments({ householdId: home })).toBe(1);
    expect((await Product.findById(productId))!.quantity).toBe(2);
    expect((await Household.findById(home))!.defaultCategoriesInitializedAt).toBeInstanceOf(Date);
  });

  it("does not recreate default categories after users rename or delete them", async () => {
    const renamed = await Category.findOne({ householdId: home, name: "Bebidas" });
    const deleted = await Category.findOne({ householdId: home, name: "Limpieza" });
    await saveCategory(owner, home, randomUUID(), { id: renamed!._id.toString(), name: "Mis bebidas", parentId: null });
    await deleteCategory(member, home, randomUUID(), deleted!._id.toString());
    await ensureDefaultCategories(member, home);
    expect(await Category.exists({ householdId: home, name: { $in: ["Bebidas", "Limpieza"] } })).toBeNull();
    expect(await Category.countDocuments({ householdId: home })).toBe(DEFAULT_CATEGORY_NAMES.length - 1);
    expect(await Category.exists({ householdId: home, name: "Mis bebidas" })).not.toBeNull();
  });

  it("denies default initialization to outsiders, unverified members, and stale sessions", async () => {
    await Household.updateOne({ _id: home }, { $unset: { defaultCategoriesInitializedAt: 1 } });
    await expect(ensureDefaultCategories(outsider, home)).rejects.toThrow("permiso");
    await User.updateOne({ _id: member.id }, { $set: { emailVerifiedAt: null } });
    await expect(ensureDefaultCategories(member, home)).rejects.toThrow("verifica");
    await expect(ensureDefaultCategories({ ...owner, sessionVersion: 99 }, home)).rejects.toThrow("Inicia sesión");
    expect((await Household.findById(home))!.defaultCategoriesInitializedAt).toBeNull();
  });

  it("creates a product and its new subcategory together and deduplicates retries", async () => {
    const parent = await Category.findOne({ householdId: home, name: "Despensa" });
    const requestId = randomUUID();
    const draft = { ...input, name: "Atún", newCategoryName: "Conservas", newCategoryParentId: parent!._id.toString() };
    const result = await createProduct(member, home, requestId, draft);
    expect(await createProduct(member, home, requestId, draft)).toEqual(result);
    const category = await Category.findOne({ householdId: home, name: "Conservas" });
    expect(category!.parentId!.toString()).toBe(parent!._id.toString());
    expect((await Product.findById(result.id))!.categoryId!.toString()).toBe(category!._id.toString());
    expect(await Category.countDocuments({ householdId: home, name: "Conservas" })).toBe(1);
    expect(await StockMovement.countDocuments({ householdId: home, requestId })).toBe(1);
  });

  it("reuses one category when two members create it with their products concurrently", async () => {
    const results = await Promise.all([
      createProduct(owner, home, randomUUID(), { ...input, name: "Pasta", newCategoryName: "Especiales" }),
      createProduct(member, home, randomUUID(), { ...input, name: "Salsa", newCategoryName: "especiales" }),
    ]);
    const products = await Product.find({ _id: { $in: results.map((item) => item.id) } });
    expect(products[0].categoryId!.toString()).toBe(products[1].categoryId!.toString());
    expect(await Category.countDocuments({ householdId: home, name: /^especiales$/i })).toBe(1);
  });

  it("rolls back inline category creation if saving the product fails, then allows a safe retry", async () => {
    const requestId = randomUUID();
    const draft = { ...input, name: "Nuevo producto", newCategoryName: "Nueva categoría" };
    const insert = vi.spyOn(Product, "create").mockRejectedValueOnce(new Error("Product insert failed"));
    try {
      await expect(createProduct(owner, home, requestId, draft)).rejects.toThrow("Product insert failed");
      expect(await Category.exists({ householdId: home, name: "Nueva categoría" })).toBeNull();
      expect(await Product.exists({ householdId: home, name: "Nuevo producto" })).toBeNull();
    } finally { insert.mockRestore(); }
    await expect(createProduct(owner, home, requestId, draft)).resolves.toBeDefined();
    expect(await Category.countDocuments({ householdId: home, name: "Nueva categoría" })).toBe(1);
  });

  it("rejects cross-household category parents and ambiguous category choices", async () => {
    const foreign = await Category.findOne({ householdId: otherHome });
    await expect(createProduct(member, home, randomUUID(), { ...input, newCategoryName: "Forbidden", newCategoryParentId: foreign!._id.toString() })).rejects.toThrow("no pertenece");
    const local = await Category.findOne({ householdId: home });
    await expect(createProduct(member, home, randomUUID(), { ...input, categoryId: local!._id.toString(), newCategoryName: "Ambiguous" })).rejects.toThrow("Elige una categoría");
    expect(await Category.exists({ householdId: home, name: { $in: ["Forbidden", "Ambiguous"] } })).toBeNull();
  });

  it("supports inline category creation on edit and rolls it back on revision conflict", async () => {
    await editProduct(member, home, randomUUID(), productId, 0, { ...input, newCategoryName: "Mi categoría" });
    const product = await Product.findById(productId);
    expect((await Category.findById(product!.categoryId))!.name).toBe("Mi categoría");
    await expect(editProduct(owner, home, randomUUID(), productId, 0, { ...input, newCategoryName: "Orphan" })).rejects.toThrow("cambió");
    expect(await Category.exists({ householdId: home, name: "Orphan" })).toBeNull();
    expect((await Product.findById(productId))!.quantity).toBe(2);
  });

  it("saves initial stock with its actor and lets both members read it", async () => {
    expect(await getInventoryProduct(member, home, productId)).toMatchObject({ name: "Arroz", quantity: 2, lowStockThreshold: 1, revision: 0 });
    const activity = await listInventoryActivity(owner, home);
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ delta: 2, quantityBefore: 0, quantityAfter: 2, reason: "receipt", canUndo: true });
    expect(activity[0].actorName).toContain("Inventario");
    await expect(listInventory(outsider, home)).rejects.toThrow("permiso");
    expect(await getInventoryProduct(outsider, otherHome, productId)).toBeNull();
  });

  it("filters names before the movement limit and keeps matches household-scoped", async () => {
    await User.updateOne({ _id: owner.id }, { $set: { name: "Ana Compras" } });
    await User.updateOne({ _id: member.id }, { $set: { name: "Luis" } });
    const oats = await Product.create({ householdId: home, name: "Avena antigua" });
    const old = await StockMovement.create({ householdId: home, productId: oats._id, actorId: owner.id, delta: 1, reason: "receipt", requestId: randomUUID(), createdAt: new Date("2001-01-01T12:00:00Z") });
    await StockMovement.insertMany(Array.from({ length: 60 }, () => ({ householdId: home, productId, actorId: member.id, delta: 1, reason: "receipt", requestId: randomUUID(), createdAt: new Date("2002-01-01T12:00:00Z") })));
    const foreign = await Product.create({ householdId: otherHome, name: "Avena antigua" });
    await StockMovement.create({ householdId: otherHome, productId: foreign._id, actorId: outsider.id, delta: 1, reason: "receipt", requestId: randomUUID() });
    expect((await listInventoryActivity(owner, home, undefined, { query: "AVENA", person: "ana" })).map((item) => item.id)).toEqual([old._id.toString()]);
    expect((await listInventoryActivity(owner, home, undefined, { query: "avena" })).map((item) => item.id)).toEqual([old._id.toString()]);
    expect((await listInventoryActivity(owner, home, undefined, { person: "ana" })).some((item) => item.id === old._id.toString())).toBe(true);
    expect(await listInventoryActivity(owner, home, undefined, { person: "Nobody" })).toEqual([]);
  });

  it("includes both date boundaries in Panama time and excludes neighboring days", async () => {
    const dated = await Product.create({ householdId: home, name: "Fechas" });
    const times = ["2026-11-04T04:59:59.999Z", "2026-11-04T05:00:00.000Z", "2026-11-05T04:59:59.999Z", "2026-11-05T05:00:00.000Z"];
    const rows = await StockMovement.insertMany(times.map((date) => ({ householdId: home, productId: dated._id, actorId: owner.id, delta: 1, reason: "receipt", requestId: randomUUID(), createdAt: new Date(date) })));
    const results = await listInventoryActivity(owner, home, undefined, { query: "Fechas", from: "2026-11-04", to: "2026-11-04" });
    expect(results.map((item) => item.id)).toEqual([rows[2]._id.toString(), rows[1]._id.toString()]);
  });

  it("uses literal product/person text instead of accepting regular expressions", async () => {
    await User.updateOne({ _id: owner.id }, { $set: { name: "Persona (prueba)" } });
    const literal = await Product.create({ householdId: home, name: "Arroz [integral]" });
    const movement = await StockMovement.create({ householdId: home, productId: literal._id, actorId: owner.id, delta: 1, reason: "receipt", requestId: randomUUID() });
    expect((await listInventoryActivity(owner, home, undefined, { query: "[integral]", person: "(prueba)" })).map((item) => item.id)).toEqual([movement._id.toString()]);
    expect(await listInventoryActivity(owner, home, undefined, { query: ".*" })).toEqual([]);
    expect(await listInventoryActivity(owner, home, undefined, { person: ".*" })).toEqual([]);
  });

  it("searches archived products and people who previously belonged to the household", async () => {
    await User.updateOne({ _id: member.id }, { $set: { name: "Persona anterior" } });
    const movement = await adjustStock(member, home, randomUUID(), productId, 1);
    await setProductArchived(owner, home, randomUUID(), productId, true);
    await Membership.deleteOne({ householdId: home, userId: member.id });
    expect((await listInventoryActivity(owner, home, undefined, { query: "Arroz", person: "anterior" })).map((item) => item.id)).toEqual([movement.movementId]);
  });

  it("keeps undo eligibility accurate when the undo lies outside the filtered date range", async () => {
    const movement = await adjustStock(owner, home, randomUUID(), productId, 1);
    await StockMovement.collection.updateOne({ _id: new Types.ObjectId(movement.movementId!) }, { $set: { createdAt: new Date("2001-01-01T12:00:00Z") } });
    await undoStockMovement(owner, home, randomUUID(), movement.movementId!);
    const results = await listInventoryActivity(owner, home, undefined, { from: "2001-01-01", to: "2001-01-01" });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: movement.movementId, canUndo: false });
  });

  it("rejects invalid date ranges and unauthorized filtered reads", async () => {
    await expect(listInventoryActivity(owner, home, undefined, { from: "2026-02-30" })).rejects.toThrow("día válido");
    await expect(listInventoryActivity(owner, home, undefined, { from: "2026-11-05", to: "2026-11-01" })).rejects.toThrow("posterior");
    await expect(listInventoryActivity(outsider, home, undefined, { query: "Arroz", person: "Inventario" })).rejects.toThrow("permiso");
  });

  it("deduplicates stock retries and rejects reuse for a different actor or payload", async () => {
    const requestId = randomUUID();
    const first = await adjustStock(member, home, requestId, productId, 1);
    expect(await adjustStock(member, home, requestId, productId, 1)).toEqual(first);
    expect((await Product.findById(productId))!.quantity).toBe(3);
    expect(await StockMovement.countDocuments({ householdId: home, requestId })).toBe(1);
    await expect(adjustStock(member, home, requestId, productId, -1)).rejects.toThrow("otra operación");
    await expect(adjustStock(owner, home, requestId, productId, 1)).rejects.toThrow("otra operación");
    expect((await Product.findById(productId))!.quantity).toBe(3);
  });

  it("deduplicates zero-stock product creation and no-op corrections", async () => {
    const requestId = randomUUID();
    const first = await createProduct(owner, home, requestId, { ...input, name: "Jabón", quantity: "0" });
    expect(await createProduct(owner, home, requestId, { ...input, name: "Jabón", quantity: "0" })).toEqual(first);
    expect(await Product.countDocuments({ householdId: home, name: "Jabón" })).toBe(1);
    const correctionId = randomUUID();
    await correctStock(owner, home, correctionId, first.id, 0, "0");
    await adjustStock(member, home, randomUUID(), first.id, 1);
    await correctStock(owner, home, correctionId, first.id, 0, "0");
    expect((await Product.findById(first.id))!.quantity).toBe(1);
    expect(await StockMovement.countDocuments({ productId: first.id, reason: "correction" })).toBe(0);
  });

  it("handles concurrent decrements without negative stock or lost activity", async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 5 }, (_, index) => adjustStock(index % 2 ? owner : member, home, randomUUID(), productId, -1)));
    expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(2);
    expect((await Product.findById(productId))!.quantity).toBe(0);
    expect(await StockMovement.countDocuments({ productId, reason: "consumption" })).toBe(2);
    expect(await InventoryRequest.countDocuments({ householdId: home })).toBe(3);
  });

  it("applies a concurrently repeated request only once", async () => {
    const requestId = randomUUID();
    const results = await Promise.all(Array.from({ length: 4 }, () => adjustStock(member, home, requestId, productId, 1)));
    expect(new Set(results.map((item) => item.movementId)).size).toBe(1);
    expect((await Product.findById(productId))!.quantity).toBe(3);
  });

  it("checks revision on corrections and metadata edits", async () => {
    await adjustStock(member, home, randomUUID(), productId, 1);
    await expect(correctStock(owner, home, randomUUID(), productId, 0, "8")).rejects.toThrow("cambiaron");
    await expect(editProduct(owner, home, randomUUID(), productId, 0, { ...input, name: "Stale name" })).rejects.toThrow("cambió");
    await correctStock(owner, home, randomUUID(), productId, 1, "8");
    await editProduct(owner, home, randomUUID(), productId, 2, { ...input, name: "Arroz integral", lowStockThreshold: "3" });
    expect(await getInventoryProduct(member, home, productId)).toMatchObject({ name: "Arroz integral", quantity: 8, revision: 3, lowStockThreshold: 3 });
    expect(await StockMovement.countDocuments({ productId, reason: "correction", delta: 5 })).toBe(1);
  });

  it("rolls back quantity and deduplication when activity insertion fails", async () => {
    const requestId = randomUUID();
    const insert = vi.spyOn(StockMovement, "create").mockRejectedValueOnce(new Error("Movement unavailable"));
    try {
      await expect(adjustStock(member, home, requestId, productId, 1)).rejects.toThrow("Movement unavailable");
      expect((await Product.findById(productId))!.quantity).toBe(2);
      expect(await InventoryRequest.exists({ householdId: home, requestId })).toBeNull();
    } finally { insert.mockRestore(); }
    await adjustStock(member, home, requestId, productId, 1);
    expect((await Product.findById(productId))!.quantity).toBe(3);
  });

  it("rolls back product creation when its initial activity cannot be saved", async () => {
    const insert = vi.spyOn(StockMovement, "create").mockRejectedValueOnce(new Error("Movement unavailable"));
    try {
      await expect(createProduct(owner, home, randomUUID(), { ...input, name: "Rollback item" })).rejects.toThrow("Movement unavailable");
      expect(await Product.exists({ householdId: home, name: "Rollback item" })).toBeNull();
    } finally { insert.mockRestore(); }
  });

  it("undoes once using a compensating delta while preserving later changes", async () => {
    const original = await adjustStock(member, home, randomUUID(), productId, 2);
    await adjustStock(owner, home, randomUUID(), productId, -1);
    const requestId = randomUUID();
    const undone = await undoStockMovement(owner, home, requestId, original.movementId!);
    expect((await Product.findById(productId))!.quantity).toBe(1);
    expect(await undoStockMovement(owner, home, requestId, original.movementId!)).toEqual(undone);
    await expect(undoStockMovement(member, home, randomUUID(), original.movementId!)).rejects.toThrow("ya fue deshecho");
    await expect(undoStockMovement(owner, home, randomUUID(), undone.movementId!)).rejects.toThrow("no se puede deshacer");
    const activity = await listInventoryActivity(member, home);
    expect(activity.find((item) => item.id === original.movementId)!.canUndo).toBe(false);
  });

  it("allows only one concurrent undo and preserves consistent stock and activity", async () => {
    const original = await adjustStock(member, home, randomUUID(), productId, 1);
    const outcomes = await Promise.allSettled([
      undoStockMovement(owner, home, randomUUID(), original.movementId!),
      undoStockMovement(member, home, randomUUID(), original.movementId!),
    ]);
    expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect((await Product.findById(productId))!.quantity).toBe(2);
    expect(await StockMovement.countDocuments({ householdId: home, undoOfMovementId: original.movementId })).toBe(1);
  });

  it("rejects undo that would make stock negative and prevents overflow", async () => {
    const original = await adjustStock(member, home, randomUUID(), productId, 3);
    await adjustStock(owner, home, randomUUID(), productId, -5);
    await expect(undoStockMovement(owner, home, randomUUID(), original.movementId!)).rejects.toThrow("No se puede aplicar");
    const large = await createProduct(owner, home, randomUUID(), { ...input, name: "Límite", quantity: String(Number.MAX_SAFE_INTEGER) });
    await expect(adjustStock(member, home, randomUUID(), large.id, 1)).rejects.toThrow("No se puede aplicar");
    expect((await Product.findById(large.id))!.quantity).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("archives without losing stock/activity and requires restore before adjusting", async () => {
    await setProductArchived(member, home, randomUUID(), productId, true);
    expect((await listInventory(owner, home)).products).toHaveLength(0);
    expect((await listInventory(owner, home, { archived: true })).products[0]).toMatchObject({ quantity: 2 });
    await expect(adjustStock(member, home, randomUUID(), productId, 1)).rejects.toThrow("No se puede aplicar");
    expect(await StockMovement.countDocuments({ productId })).toBe(1);
    await setProductArchived(owner, home, randomUUID(), productId, false);
    await adjustStock(member, home, randomUUID(), productId, -1);
    expect((await listInventory(owner, home)).products[0].quantity).toBe(1);
  });

  it("blocks removed members, unverified accounts, and stale sessions even for retries", async () => {
    const requestId = randomUUID();
    await adjustStock(member, home, requestId, productId, 1);
    await removeFamilyMember(owner, home, member.id);
    await expect(adjustStock(member, home, requestId, productId, 1)).rejects.toThrow("permiso");
    await expect(listInventory(member, home)).rejects.toThrow("permiso");
    await User.updateOne({ _id: owner.id }, { emailVerifiedAt: null });
    await expect(adjustStock(owner, home, randomUUID(), productId, 1)).rejects.toThrow("verifica");
    await expect(listInventory(owner, home)).rejects.toThrow("verifica");
    await User.updateOne({ _id: owner.id }, { emailVerifiedAt: new Date(), sessionVersion: 1 });
    await expect(adjustStock(owner, home, randomUUID(), productId, 1)).rejects.toThrow("Inicia sesión");
  });

  it("scopes product, movement and category mutations to the current household", async () => {
    const category = await saveCategory(outsider, otherHome, randomUUID(), { name: "Privada", parentId: null });
    await expect(createProduct(member, home, randomUUID(), { ...input, categoryId: category.id })).rejects.toThrow("no pertenece");
    await expect(adjustStock(outsider, otherHome, randomUUID(), productId, 1)).rejects.toThrow("No se puede aplicar");
    const original = await StockMovement.findOne({ productId });
    await expect(undoStockMovement(outsider, otherHome, randomUUID(), original!._id.toString())).rejects.toThrow("no se puede deshacer");
    await expect(saveCategory(member, home, randomUUID(), { id: category.id, name: "Hijack", parentId: null })).rejects.toThrow("no pertenece");
    await expect(deleteCategory(member, home, randomUUID(), category.id)).rejects.toThrow("no pertenece");
  });

  it("creates and renames subcategories, rejects cycles/duplicates, and protects populated categories", async () => {
    const parent = await saveCategory(owner, home, randomUUID(), { name: "Alimentos", parentId: null });
    const child = await saveCategory(member, home, randomUUID(), { name: "Despensa", parentId: parent.id });
    await expect(saveCategory(member, home, randomUUID(), { id: parent.id, name: "Alimentos", parentId: child.id })).rejects.toThrow("ciclo");
    await expect(saveCategory(owner, home, randomUUID(), { name: "alimentos", parentId: null })).rejects.toThrow("Ya existe");
    await expect(deleteCategory(member, home, randomUUID(), parent.id)).rejects.toThrow("Mueve primero");
    await editProduct(owner, home, randomUUID(), productId, 0, { ...input, categoryId: child.id });
    await saveCategory(member, home, randomUUID(), { id: child.id, name: "Cereales", parentId: parent.id });
    expect((await listInventory(member, home, { categoryId: parent.id })).products[0].categoryId).toBe(child.id);
    await setProductArchived(owner, home, randomUUID(), productId, true);
    await expect(deleteCategory(member, home, randomUUID(), child.id)).rejects.toThrow("archivados");
    await setProductArchived(owner, home, randomUUID(), productId, false);
    await editProduct(owner, home, randomUUID(), productId, 3, { ...input, categoryId: null });
    await deleteCategory(member, home, randomUUID(), child.id);
    await deleteCategory(owner, home, randomUUID(), parent.id);
    expect((await Category.find({ householdId: home }).lean()).map((item) => item.name).sort()).toEqual([...DEFAULT_CATEGORY_NAMES].sort());
  });

  it("prioritizes empty and threshold stock before the page limit, alphabetically within each group", async () => {
    await Product.insertMany([
      ...Array.from({ length: 110 }, (_, index) => ({ householdId: home, name: `A normal ${String(index).padStart(3, "0")}`, quantity: 10, lowStockThreshold: 1 })),
      { householdId: home, name: "Z agotado", quantity: 0, lowStockThreshold: null },
      { householdId: home, name: "A agotado", quantity: 0, lowStockThreshold: 0 },
      { householdId: home, name: "Z por reponer", quantity: 3, lowStockThreshold: 3 },
      { householdId: home, name: "B sin aviso", quantity: 5, lowStockThreshold: null },
      { householdId: home, name: "Y con existencias", quantity: 1, lowStockThreshold: 0 },
    ]);
    await Product.create({ householdId: otherHome, name: "Otro hogar agotado", quantity: 0 });
    const result = await listInventory(member, home);
    expect(result.total).toBe(116);
    expect(result.products).toHaveLength(100);
    expect(result.products.slice(0, 3).map((item) => item.name)).toEqual(["A agotado", "Z agotado", "Z por reponer"]);
    expect(result.products.some((item) => item.name === "Otro hogar agotado")).toBe(false);
    const low = await listInventory(owner, home, { lowStock: true });
    expect(low.products.map((item) => item.name)).toEqual(["A agotado", "Z agotado", "Z por reponer"]);
    expect(low.total).toBe(3);
    expect((await listInventory(owner, home, { query: "agotado" })).products.map((item) => item.name)).toEqual(["A agotado", "Z agotado"]);
  });

  it("excludes archived products from buying priority and preserves alphabetical archive browsing", async () => {
    await Product.insertMany([
      { householdId: home, name: "A archivado", quantity: 5, lowStockThreshold: 1, archivedAt: new Date() },
      { householdId: home, name: "Z archivado", quantity: 0, lowStockThreshold: null, archivedAt: new Date() },
      { householdId: home, name: "B activo", quantity: 0, lowStockThreshold: null },
    ]);
    expect((await listInventory(owner, home)).products.map((item) => item.name)).toEqual(["B activo", "Arroz"]);
    expect((await listInventory(owner, home, { archived: true })).products.map((item) => item.name)).toEqual(["A archivado", "Z archivado"]);
  });

  it("recomputes buying priority after replenishing or consuming stock", async () => {
    const missing = await createProduct(owner, home, randomUUID(), { ...input, name: "Z falta", quantity: "0" });
    expect((await listInventory(owner, home)).products.map((item) => item.name)).toEqual(["Z falta", "Arroz"]);
    await adjustStock(member, home, randomUUID(), missing.id, 1);
    expect((await listInventory(owner, home)).products.map((item) => item.name)).toEqual(["Z falta", "Arroz"]);
    await adjustStock(owner, home, randomUUID(), missing.id, 1);
    expect((await listInventory(owner, home)).products.map((item) => item.name)).toEqual(["Arroz", "Z falta"]);
    await adjustStock(member, home, randomUUID(), productId, -1);
    expect((await listInventory(owner, home, { lowStock: true })).products.map((item) => item.name)).toEqual(["Arroz"]);
  });

  it("handles legacy products without a warning threshold", async () => {
    const legacyId = new Types.ObjectId();
    await Product.collection.insertOne({ _id: legacyId, householdId: new Types.ObjectId(home), name: "Z legado", unit: "unidades", quantity: 0, archivedAt: null, revision: 0 });
    const empty = await listInventory(owner, home, { lowStock: true });
    expect(empty.products).toHaveLength(1);
    expect(empty.products[0]).toMatchObject({ id: legacyId.toString(), lowStockThreshold: null });
    await Product.collection.updateOne({ _id: legacyId }, { $set: { quantity: 4 } });
    expect((await listInventory(owner, home, { lowStock: true })).products).toEqual([]);
  });

  it("searches literal text, filters low stock, and includes categories without leaking another home", async () => {
    await createProduct(owner, home, randomUUID(), { ...input, name: "Jabón (manos)", quantity: "0", lowStockThreshold: "0" });
    await createProduct(outsider, otherHome, randomUUID(), { ...input, name: "Jabón (manos)" });
    expect((await listInventory(member, home, { query: "(manos)" })).total).toBe(1);
    expect((await listInventory(member, home, { query: ".*" })).total).toBe(0);
    expect((await listInventory(member, home, { lowStock: true })).products.map((item) => item.name)).toEqual(["Jabón (manos)"]);
    await expect(listInventory(member, home, { categoryId: new Types.ObjectId().toString() })).rejects.toThrow("no pertenece");
  });

  it("separates buying from explicit received quantities and traces the receiving member", async () => {
    const item = await addShoppingItem(owner, home, randomUUID(), { productId, name: "Ignored", unit: "Ignored", quantity: "3" });
    await setShoppingPurchased(member, home, randomUUID(), item.id, 0, true);
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(2);
    await receiveShoppingItem(member, home, randomUUID(), item.id, 1, "4");
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(6);
    const received = await ShoppingItem.findById(item.id).lean();
    expect(received).toMatchObject({ name: "Arroz", unit: "bolsas", quantity: 3, receivedQuantity: 4, status: "received", revision: 2 });
    expect(await StockMovement.findById(received!.receivedMovementId).lean()).toMatchObject({ delta: 4, quantityBefore: 2, quantityAfter: 6, reason: "receipt", actorId: new Types.ObjectId(member.id) });
    expect(received?.receivedAt).toBeInstanceOf(Date);
  });

  it("deduplicates receipt retries and blocks new requests from receiving the same item twice", async () => {
    const item = await addShoppingItem(owner, home, randomUUID(), { productId, name: "", unit: "", quantity: 2 });
    await setShoppingPurchased(owner, home, randomUUID(), item.id, 0, true);
    const requestId = randomUUID();
    const first = await receiveShoppingItem(owner, home, requestId, item.id, 1, 2);
    expect(await receiveShoppingItem(owner, home, requestId, item.id, 1, 2)).toEqual(first);
    await expect(receiveShoppingItem(member, home, randomUUID(), item.id, 1, 2)).rejects.toThrow("ya fue recibido");
    await expect(receiveShoppingItem(owner, home, requestId, item.id, 1, 3)).rejects.toThrow("otra operación");
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(4);
    expect(await StockMovement.countDocuments({ householdId: home, requestId })).toBe(1);
    const nextTrip = await addShoppingItem(member, home, randomUUID(), { productId, name: "", unit: "", quantity: 1 });
    expect(nextTrip.id).not.toBe(item.id);
  });

  it("serializes two household members receiving the same item concurrently", async () => {
    const item = await addShoppingItem(owner, home, randomUUID(), { productId, quantity: 1, name: "", unit: "" });
    await setShoppingPurchased(owner, home, randomUUID(), item.id, 0, true);
    const results = await Promise.allSettled([receiveShoppingItem(owner, home, randomUUID(), item.id, 1, 1), receiveShoppingItem(member, home, randomUUID(), item.id, 1, 1)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(3);
    expect(await ShoppingItem.findById(item.id).lean()).toMatchObject({ status: "received", receivedQuantity: 1 });
  });

  it("adds missing stock once across bulk/manual additions and preserves existing planned amounts", async () => {
    await Product.updateOne({ _id: productId }, { quantity: 0, lowStockThreshold: null });
    await Product.insertMany([
      { householdId: home, name: "Leche", quantity: 2, lowStockThreshold: 2 },
      { householdId: home, name: "Disponible", quantity: 3, lowStockThreshold: 2 },
      { householdId: home, name: "Archivado", quantity: 0, archivedAt: new Date() },
      { householdId: otherHome, name: "Ajeno", quantity: 0 },
    ]);
    await Promise.all([addLowStockToShopping(owner, home, randomUUID()), addShoppingItem(member, home, randomUUID(), { productId, quantity: 3, name: "", unit: "" })]);
    const pending = await listShoppingItems(owner, home, "pending");
    expect(pending.items.map((item) => item.name).sort()).toEqual(["Arroz", "Leche"]);
    const rice = pending.items.find((item) => item.productId === productId)!;
    await editShoppingQuantity(member, home, randomUUID(), rice.id, 0, 7);
    await setShoppingPurchased(member, home, randomUUID(), rice.id, 1, true);
    await addLowStockToShopping(owner, home, randomUUID());
    expect(await ShoppingItem.countDocuments({ householdId: home, productId })).toBe(1);
    expect(await ShoppingItem.findById(rice.id).lean()).toMatchObject({ quantity: 7, status: "purchased" });
  });

  it("handles custom shopping items without creating inventory or stock movements", async () => {
    const before = await StockMovement.countDocuments({ householdId: home });
    const item = await addShoppingItem(member, home, randomUUID(), { productId: null, name: "Servilletas", unit: "paquetes", quantity: 2 });
    await expect(receiveShoppingItem(member, home, randomUUID(), item.id, 0, 2)).rejects.toThrow("como comprado");
    await setShoppingPurchased(owner, home, randomUUID(), item.id, 0, true);
    await receiveShoppingItem(member, home, randomUUID(), item.id, 1, 3);
    expect(await StockMovement.countDocuments({ householdId: home })).toBe(before);
    expect(await Product.countDocuments({ householdId: home })).toBe(1);
    expect((await listShoppingItems(owner, home, "received")).items[0]).toMatchObject({ name: "Servilletas", productId: null, receivedQuantity: 3 });
  });

  it("rejects stale edits and purchase changes, preserves receipt history, and deletes without changing stock", async () => {
    const item = await addShoppingItem(owner, home, randomUUID(), { productId, name: "", unit: "", quantity: 2 });
    await editShoppingQuantity(member, home, randomUUID(), item.id, 0, 4);
    await expect(setShoppingPurchased(owner, home, randomUUID(), item.id, 0, true)).rejects.toThrow("lista cambió");
    await expect(deleteShoppingItem(owner, home, randomUUID(), item.id, 0)).rejects.toThrow("lista cambió");
    await setShoppingPurchased(owner, home, randomUUID(), item.id, 1, true);
    await setShoppingPurchased(member, home, randomUUID(), item.id, 2, false);
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(2);
    await deleteShoppingItem(member, home, randomUUID(), item.id, 3);
    expect(await getShoppingItem(owner, home, item.id)).toBeNull();
  });

  it("rolls back receipts for archived products and stock overflow", async () => {
    const item = await addShoppingItem(owner, home, randomUUID(), { productId, quantity: 2, name: "", unit: "" });
    await setShoppingPurchased(owner, home, randomUUID(), item.id, 0, true);
    await setProductArchived(owner, home, randomUUID(), productId, true);
    await expect(receiveShoppingItem(member, home, randomUUID(), item.id, 1, 2)).rejects.toThrow("No se puede aplicar");
    expect(await getShoppingItem(owner, home, item.id)).toMatchObject({ status: "purchased", revision: 1 });
    await expect(addShoppingItem(member, home, randomUUID(), { productId, quantity: 1, name: "", unit: "" })).rejects.toThrow("Restaura");
    await setProductArchived(owner, home, randomUUID(), productId, false);
    await Product.updateOne({ _id: productId }, { quantity: Number.MAX_SAFE_INTEGER });
    await expect(receiveShoppingItem(member, home, randomUUID(), item.id, 1, 1)).rejects.toThrow("No se puede aplicar");
    expect(await getShoppingItem(owner, home, item.id)).toMatchObject({ status: "purchased", revision: 1 });
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("enforces household references, current membership, verified sessions, and permissions on retries", async () => {
    await expect(addShoppingItem(outsider, otherHome, randomUUID(), { productId, name: "", unit: "", quantity: 1 })).rejects.toThrow("no pertenece");
    const requestId = randomUUID();
    const item = await addShoppingItem(member, home, requestId, { productId, name: "", unit: "", quantity: 1 });
    await expect(getShoppingItem(outsider, otherHome, item.id)).resolves.toBeNull();
    await expect(setShoppingPurchased(outsider, otherHome, randomUUID(), item.id, 0, true)).rejects.toThrow("no pertenece");
    await expect(listShoppingItems(outsider, home, "pending")).rejects.toThrow();
    await expect(shoppingProductOptions(outsider, home)).rejects.toThrow();
    await expect(addLowStockToShopping({ ...member, sessionVersion: 999 }, home, randomUUID())).rejects.toThrow("Inicia sesión");
    await Membership.deleteOne({ userId: member.id, householdId: home });
    await expect(addShoppingItem(member, home, requestId, { productId, name: "", unit: "", quantity: 1 })).rejects.toThrow("No tienes permiso");
    await expect(receiveShoppingItem(member, home, randomUUID(), item.id, 0, 1)).rejects.toThrow("No tienes permiso");
    await expect(listShoppingItems(member, home, "pending")).rejects.toThrow("No tienes permiso");
    await User.updateOne({ _id: owner.id }, { emailVerifiedAt: null });
    await expect(addLowStockToShopping(owner, home, randomUUID())).rejects.toThrow("verifica tu correo");
  });

  it("deduplicates additions even after deletion and validates quantity boundaries", async () => {
    const input = { productId: null, name: "Jabón (manos)", unit: "botellas", quantity: 1 };
    const requestId = randomUUID();
    const item = await addShoppingItem(owner, home, requestId, input);
    expect(await addShoppingItem(owner, home, requestId, input)).toEqual(item);
    await deleteShoppingItem(owner, home, randomUUID(), item.id, 0);
    expect(await addShoppingItem(owner, home, requestId, input)).toEqual(item);
    expect(await ShoppingItem.exists({ _id: item.id })).toBeNull();
    for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1e3"]) await expect(addShoppingItem(owner, home, randomUUID(), { ...input, quantity })).rejects.toThrow();
  });

  it("filters shopping names literally, scopes reads and searches products beyond the initial options", async () => {
    await addShoppingItem(owner, home, randomUUID(), { productId: null, name: "Jabón (manos)", unit: "botellas", quantity: 1 });
    await addShoppingItem(outsider, otherHome, randomUUID(), { productId: null, name: "Jabón (manos)", unit: "botellas", quantity: 1 });
    expect((await listShoppingItems(member, home, "pending", "(manos)")).total).toBe(1);
    expect((await listShoppingItems(member, home, "pending", ".*")).total).toBe(0);
    await Product.insertMany(Array.from({ length: 105 }, (_, i) => ({ householdId: home, name: `A producto ${i}` })));
    await Product.create({ householdId: home, name: "Z final" });
    expect(await shoppingProductOptions(member, home)).toHaveLength(100);
    expect((await shoppingProductOptions(member, home, "Z final")).map((product) => product.name)).toEqual(["Z final"]);
    expect((await shoppingProductOptions(outsider, otherHome, "Z final"))).toEqual([]);
  });

  it("blocks receipt if the linked product unit changed while shopping", async () => {
    const item = await addShoppingItem(owner, home, randomUUID(), { productId, quantity: 2, name: "", unit: "" });
    await setShoppingPurchased(member, home, randomUUID(), item.id, 0, true);
    await Product.updateOne({ _id: productId }, { unit: "kilogramos" });
    await expect(receiveShoppingItem(member, home, randomUUID(), item.id, 1, 2)).rejects.toThrow("unidad del producto cambió");
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(2);
    expect(await getShoppingItem(owner, home, item.id)).toMatchObject({ status: "purchased", revision: 1 });
  });

  it("saves the inline quantity and purchased state together without changing stock", async () => {
    const item = await addShoppingItem(owner, home, randomUUID(), { productId, quantity: 1, name: "", unit: "" });
    await expect(setShoppingPurchased(member, home, randomUUID(), item.id, 0, true, "0")).rejects.toThrow();
    expect(await getShoppingItem(owner, home, item.id)).toMatchObject({ status: "pending", revision: 0, quantity: 1 });
    await setShoppingPurchased(member, home, randomUUID(), item.id, 0, true, "5");
    expect(await getShoppingItem(owner, home, item.id)).toMatchObject({ status: "purchased", revision: 1, quantity: 5 });
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(2);
    await expect(setShoppingPurchased(owner, home, randomUUID(), item.id, 0, true, "8")).rejects.toThrow("lista cambió");
    await setShoppingPurchased(owner, home, randomUUID(), item.id, 1, false);
    expect(await getShoppingItem(owner, home, item.id)).toMatchObject({ status: "pending", quantity: 5 });
  });

  it("receives a complete purchase atomically, including custom entries, with distinct stock movements", async () => {
    const milk = await createProduct(owner, home, randomUUID(), { ...input, name: "Leche", quantity: "0" });
    for (const [id, quantity] of [[productId, 3], [milk.id, 2]] as const) {
      const item = await addShoppingItem(owner, home, randomUUID(), { productId: id, quantity: 1, name: "", unit: "" });
      await setShoppingPurchased(member, home, randomUUID(), item.id, 0, true, quantity);
    }
    const custom = await addShoppingItem(member, home, randomUUID(), { productId: null, quantity: 4, name: "Servilletas", unit: "paquetes" });
    await setShoppingPurchased(member, home, randomUUID(), custom.id, 0, true);
    const selected = await purchasedReceiptItems(owner, home);
    expect(selected).toHaveLength(3);
    const requestId = "x".repeat(128);
    const received = await receivePurchasedItems(owner, home, requestId, JSON.stringify(selected));
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(5);
    expect((await getInventoryProduct(owner, home, milk.id))?.quantity).toBe(2);
    expect(await purchasedReceiptItems(member, home)).toEqual([]);
    expect((await listShoppingItems(owner, home, "received")).total).toBe(3);
    const entries = await ShoppingItem.find({ householdId: home, status: "received", productId: { $ne: null } }).lean();
    expect(new Set(entries.map((item) => item.receivedMovementId?.toString())).size).toBe(2);
    const movements = await StockMovement.find({ _id: { $in: entries.map((item) => item.receivedMovementId) } }).lean();
    expect(movements.every((movement) => movement.actorId.toString() === owner.id && movement.requestId.length === 64)).toBe(true);
    expect(await receivePurchasedItems(owner, home, requestId, [...selected].reverse())).toEqual(received);
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(5);
    await expect(receivePurchasedItems(member, home, randomUUID(), selected)).rejects.toThrow("ya fue recibido");
    await expect(deleteShoppingItem(member, home, randomUUID(), custom.id, 2)).rejects.toThrow("ya fue recibido");
  });

  it("rolls back every receipt when any selected product changed or would overflow", async () => {
    const first = await addShoppingItem(owner, home, randomUUID(), { productId, quantity: 2, name: "", unit: "" });
    const milk = await createProduct(owner, home, randomUUID(), { ...input, name: "Leche", quantity: "1" });
    const second = await addShoppingItem(owner, home, randomUUID(), { productId: milk.id, quantity: 2, name: "", unit: "" });
    await setShoppingPurchased(member, home, randomUUID(), first.id, 0, true);
    await setShoppingPurchased(member, home, randomUUID(), second.id, 0, true);
    const selected = await purchasedReceiptItems(owner, home);
    const before = await StockMovement.countDocuments({ householdId: home });
    await Product.updateOne({ _id: milk.id }, { unit: "cartones" });
    await expect(receivePurchasedItems(member, home, randomUUID(), selected)).rejects.toThrow("unidad del producto cambió");
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(2);
    expect(await StockMovement.countDocuments({ householdId: home })).toBe(before);
    expect(await purchasedReceiptItems(owner, home)).toEqual(selected);
    await Product.updateOne({ _id: milk.id }, { unit: "bolsas", quantity: Number.MAX_SAFE_INTEGER });
    await expect(receivePurchasedItems(member, home, randomUUID(), selected)).rejects.toThrow("No se puede aplicar");
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(2);
    expect(await purchasedReceiptItems(owner, home)).toEqual(selected);
  });

  it("blocks stale and tampered batch quantities and preserves items purchased after the reviewed snapshot", async () => {
    const first = await addShoppingItem(owner, home, randomUUID(), { productId, quantity: 2, name: "", unit: "" });
    await setShoppingPurchased(owner, home, randomUUID(), first.id, 0, true);
    const selected = await purchasedReceiptItems(member, home);
    await expect(receivePurchasedItems(member, home, randomUUID(), [{ ...selected[0], quantity: 3 }])).rejects.toThrow("cantidades cambiaron");
    await editShoppingQuantity(owner, home, randomUUID(), first.id, 1, 4);
    await expect(receivePurchasedItems(member, home, randomUUID(), selected)).rejects.toThrow("lista cambió");
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(2);
    const refreshed = await purchasedReceiptItems(member, home);
    const later = await addShoppingItem(owner, home, randomUUID(), { productId: null, name: "Después", quantity: 1, unit: "unidad" });
    await setShoppingPurchased(owner, home, randomUUID(), later.id, 0, true);
    await receivePurchasedItems(member, home, randomUUID(), refreshed);
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(6);
    expect(await purchasedReceiptItems(owner, home)).toEqual([{ id: later.id, revision: 1, quantity: 1 }]);
  });

  it("allows only one of two concurrent batch confirmations to update stock", async () => {
    const item = await addShoppingItem(owner, home, randomUUID(), { productId, quantity: 3, name: "", unit: "" });
    await setShoppingPurchased(owner, home, randomUUID(), item.id, 0, true);
    const selected = await purchasedReceiptItems(member, home);
    const results = await Promise.allSettled([receivePurchasedItems(owner, home, randomUUID(), selected), receivePurchasedItems(member, home, randomUUID(), selected)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(5);
  });

  it("checks batch membership and references without partially receiving another household's item", async () => {
    const own = await addShoppingItem(owner, home, randomUUID(), { productId, quantity: 2, name: "", unit: "" });
    await setShoppingPurchased(owner, home, randomUUID(), own.id, 0, true);
    const foreign = await addShoppingItem(outsider, otherHome, randomUUID(), { productId: null, name: "Ajeno", quantity: 1, unit: "unidad" });
    await setShoppingPurchased(outsider, otherHome, randomUUID(), foreign.id, 0, true);
    const selected = await purchasedReceiptItems(owner, home);
    await expect(receivePurchasedItems(member, home, randomUUID(), [...selected, { id: foreign.id, revision: 1, quantity: 1 }])).rejects.toThrow("no pertenece");
    expect((await getInventoryProduct(owner, home, productId))?.quantity).toBe(2);
    const requestId = randomUUID();
    await receivePurchasedItems(member, home, requestId, selected);
    await Membership.deleteOne({ householdId: home, userId: member.id });
    await expect(receivePurchasedItems(member, home, requestId, selected)).rejects.toThrow("No tienes permiso");
    await expect(purchasedReceiptItems(member, home)).rejects.toThrow("No tienes permiso");
  });

  it("receives all purchased entries beyond the 100-row display limit", async () => {
    await ShoppingItem.insertMany(Array.from({ length: 101 }, (_, index) => ({ householdId: home, addedById: owner.id, name: `Artículo ${index}`, quantity: 1, status: "purchased" })));
    const selected = await purchasedReceiptItems(member, home);
    expect(selected).toHaveLength(101);
    const page = await listShoppingItems(owner, home, "purchased");
    expect(page.items).toHaveLength(100);
    expect(page.receiptItems.slice(0, 100)).toEqual(page.items.map(({ id, revision, quantity }) => ({ id, revision, quantity })));
    await receivePurchasedItems(member, home, randomUUID(), selected);
    expect(await purchasedReceiptItems(owner, home)).toEqual([]);
    expect((await listShoppingItems(owner, home, "received")).total).toBe(101);
  });
});
