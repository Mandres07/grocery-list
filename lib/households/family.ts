import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { AccountError, emailAddress, validToken } from "@/lib/auth/validation";
import { tokenHash } from "@/lib/auth/accounts";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { applicationUrl, emailConfiguration, sendInvitationEmail } from "@/lib/email/account-email";
import Household from "@/models/Household";
import Invitation from "@/models/Invitation";
import Membership from "@/models/Membership";
import User from "@/models/User";
import { requireObjectId } from "./access";
import { lockHouseholdAccess, lockVerifiedUser, type HouseholdActor } from "./mutation-access";

export type FamilyActor = HouseholdActor;
const invitationLifetime = 7 * 24 * 60 * 60_000;
const invalidInvitation = "Esta invitación no está disponible. Puede haber vencido, sido revocada o aceptada. Pide un nuevo enlace a la persona propietaria.";

export async function inviteFamilyMember(actor: FamilyActor, householdId: string, rawEmail: unknown, invitationId?: string) {
  const email = emailAddress(rawEmail);
  const householdObjectId = requireObjectId(householdId);
  const invitationObjectId = invitationId ? requireObjectId(invitationId) : undefined;
  await consumeRateLimit(`family-send:${actor.id}`, 20, 15 * 60_000);
  emailConfiguration();
  applicationUrl();
  const token = randomBytes(32).toString("hex");
  const hash = tokenHash(token);
  const reservation = await mongoose.connection.transaction(async (session) => {
    const { user, household } = await lockHouseholdAccess(actor, householdId, session, true);
    if (user.email === email) throw new AccountError("Ya eres parte de este hogar.");
    const recipient = await User.findOne({ email }).session(session);
    if (recipient && await Membership.exists({ userId: recipient._id, householdId: householdObjectId }).session(session)) {
      throw new AccountError("Esta persona ya pertenece al hogar.");
    }
    const now = new Date();
    if (invitationObjectId) {
      if (await Invitation.exists({ householdId: householdObjectId, email, status: "pending", _id: { $ne: invitationObjectId }, expiresAt: { $gt: now } }).session(session)) {
        throw new AccountError("Ya hay una invitación pendiente más reciente para este correo. Usa esa invitación.");
      }
      await Invitation.updateMany({ householdId: householdObjectId, email, status: "pending", _id: { $ne: invitationObjectId }, expiresAt: { $lte: now } }, { $set: { status: "expired" } }, { session });
      const invitation = await Invitation.findOneAndUpdate({
        _id: invitationObjectId, householdId: householdObjectId, email, status: { $in: ["pending", "expired"] },
        $or: [{ sentAt: null }, { sentAt: { $lte: new Date(now.getTime() - 60_000) } }],
      }, { $set: { tokenHash: hash, status: "pending", sentAt: now, expiresAt: new Date(now.getTime() + invitationLifetime), invitedById: user._id } }, { session });
      if (!invitation) throw new AccountError("No se pudo reenviar. Espera un minuto y revisa el estado de la invitación.");
      return { id: invitation._id, householdName: household.name };
    }
    await Invitation.updateMany({ householdId: householdObjectId, email, status: "pending", expiresAt: { $lte: now } }, { $set: { status: "expired" } }, { session });
    if (await Invitation.exists({ householdId: householdObjectId, email, status: "pending" }).session(session)) {
      throw new AccountError("Ya hay una invitación pendiente para este correo. Puedes reenviarla o revocarla.");
    }
    const [invitation] = await Invitation.create([{
      householdId: householdObjectId, invitedById: user._id, email, tokenHash: hash, status: "pending", sentAt: now, expiresAt: new Date(now.getTime() + invitationLifetime),
    }], { session });
    return { id: invitation._id, householdName: household.name };
  });
  try {
    await sendInvitationEmail(email, token, reservation.householdName);
  } catch (error) {
    // Do not revoke a newer resend or an invitation already accepted/revoked.
    await Invitation.updateOne({ _id: reservation.id, tokenHash: hash, status: "pending" }, { $set: { status: "revoked" } });
    console.error("Invitation email unavailable");
    if (error instanceof AccountError) throw error;
    throw new AccountError("No pudimos enviar la invitación. Vuelve a invitar a esta persona.");
  }
  return "Invitación enviada. El enlace vence en siete días.";
}

export async function revokeFamilyInvitation(actor: FamilyActor, householdId: string, invitationId: string) {
  const invitation = requireObjectId(invitationId);
  await connectToDatabase();
  await mongoose.connection.transaction(async (session) => {
    const { household } = await lockHouseholdAccess(actor, householdId, session, true);
    const result = await Invitation.updateOne({ _id: invitation, householdId: household._id, status: { $in: ["pending", "expired"] } }, { $set: { status: "revoked" } }, { session });
    if (!result.modifiedCount) throw new AccountError("La invitación ya no se puede revocar. Actualiza la página.");
  });
  return "Invitación revocada. Su enlace ya no permite unirse al hogar.";
}

export async function removeFamilyMember(actor: FamilyActor, householdId: string, memberId: string) {
  const member = requireObjectId(memberId);
  await connectToDatabase();
  await mongoose.connection.transaction(async (session) => {
    const { household } = await lockHouseholdAccess(actor, householdId, session, true);
    if (household.ownerId.equals(member)) throw new AccountError("No puedes retirar a la persona propietaria del hogar.");
    const result = await Membership.deleteOne({ householdId: household._id, userId: member }, { session });
    if (!result.deletedCount) throw new AccountError("Esta persona ya no pertenece al hogar.");
    const recipient = await User.findById(member).session(session);
    if (recipient) await Invitation.updateMany({ householdId: household._id, email: recipient.email, status: "pending" }, { $set: { status: "revoked" } }, { session });
  });
  return "Persona retirada. Ya no tiene acceso a los datos del hogar. El historial compartido se conserva.";
}

export async function getFamilyInvitation(token: unknown) {
  if (!validToken(token)) return null;
  await connectToDatabase();
  const invitation = await Invitation.findOne({ tokenHash: tokenHash(token) }).lean();
  if (!invitation) return null;
  const household = await Household.findById(invitation.householdId).select("name").lean();
  if (!household) return null;
  return { id: invitation._id.toString(), householdId: invitation.householdId.toString(), householdName: household.name,
    email: invitation.email, status: invitation.status === "pending" && invitation.expiresAt <= new Date() ? "expired" : invitation.status };
}

export async function acceptFamilyInvitation(actor: FamilyActor, token: unknown) {
  if (!validToken(token)) throw new AccountError(invalidInvitation);
  await connectToDatabase();
  await mongoose.connection.transaction(async (session) => {
    const user = await lockVerifiedUser(actor, session);
    const invitation = await Invitation.findOne({ tokenHash: tokenHash(token), status: "pending", expiresAt: { $gt: new Date() } }).session(session);
    if (!invitation) throw new AccountError(invalidInvitation);
    if (invitation.email !== user.email) throw new AccountError("Esta invitación es para otro correo. Inicia sesión con el correo que recibió la invitación.");
    const household = await Household.findOneAndUpdate({ _id: invitation.householdId, ownerId: invitation.invitedById }, {
      $inc: { accessRevision: 1 },
    }, { session });
    if (!household || !await Membership.exists({ householdId: household._id, userId: household.ownerId }).session(session)) {
      throw new AccountError(invalidInvitation);
    }
    if (await Membership.exists({ userId: user._id }).session(session)) {
      throw new AccountError("Ya perteneces a un hogar. No puedes unirte a otro hogar con esta cuenta.");
    }
    // Household locking serializes acceptance against revocation and removal.
    const consumed = await Invitation.updateOne({ _id: invitation._id, status: "pending", expiresAt: { $gt: new Date() } }, { $set: { status: "accepted" } }, { session });
    if (!consumed.modifiedCount) throw new AccountError(invalidInvitation);
    await Membership.create([{ householdId: household._id, userId: user._id }], { session });
  });
  return "Ya formas parte del hogar.";
}
