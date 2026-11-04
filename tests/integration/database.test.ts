import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { connectToDatabase, LOCAL_DATABASE_URI } from "@/lib/db";
import { User, Household, Membership, Invitation, Category, Product, StockMovement, initializeDatabase } from "@/models";
import { requireHouseholdAccess } from "@/lib/households/access";
import { requireProductInHousehold, validateCategoryParent } from "@/lib/inventory/references";
import { authenticateAccount, registerAccount, requestAccountEmail, resetAccountPassword, tokenHash, verifyAccountEmail } from "@/lib/auth/accounts";
import { createHousehold } from "@/lib/households/create";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { sendAccountEmail, sendInvitationEmail } from "@/lib/email/account-email";
import { acceptFamilyInvitation, getFamilyInvitation, inviteFamilyMember, removeFamilyMember, revokeFamilyInvitation, type FamilyActor } from "@/lib/households/family";

vi.mock("@/lib/email/account-email", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/email/account-email")>(),
  sendAccountEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

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
    expect(await authenticateAccount(email, password)).toBeNull();
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
    await expect(registerAccount("Retry", "retry@example.test", password)).rejects.toThrow("Email unavailable");
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

  it("does not insert an account when required email configuration is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    try {
      await expect(registerAccount("No key", "no-key@example.test", password)).rejects.toThrow("configurado");
      expect(await User.exists({ email: "no-key@example.test" })).toBeNull();
    } finally { vi.stubEnv("RESEND_API_KEY", "integration-test-not-a-real-key"); }
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
