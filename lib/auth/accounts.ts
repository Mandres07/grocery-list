import { createHash, randomBytes } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { emailConfiguration, applicationUrl, sendAccountEmail } from "@/lib/email/account-email";
import { hashPassword, verifyPassword } from "./password";
import { limitAccountRequest, consumeRateLimit } from "./rate-limit";
import { AccountError, accountPassword, displayName, emailAddress, validToken } from "./validation";

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const genericEmailMessage = "Si el correo corresponde a una cuenta que lo necesita, recibirás un enlace. Revisa también la carpeta de correo no deseado.";
const invalidLinkMessage = "Este enlace no es válido, ya fue usado o venció. Solicita uno nuevo.";

export async function requestAccountEmail(rawEmail: unknown, purpose: "verification" | "reset", limited = false) {
  const email = emailAddress(rawEmail);
  if (!limited) await limitAccountRequest(purpose, email);
  emailConfiguration();
  applicationUrl();
  await connectToDatabase();
  const token = randomBytes(32).toString("hex");
  const prefix = purpose === "verification" ? "verification" : "reset";
  const hashField = `${prefix}TokenHash`;
  const expiryField = `${prefix}ExpiresAt`;
  const sentField = `${prefix}SentAt`;
  const now = new Date();
  const user = await User.findOneAndUpdate({
    email,
    ...(purpose === "verification" ? { emailVerifiedAt: null } : { emailVerifiedAt: { $ne: null } }),
    $or: [{ [sentField]: null }, { [sentField]: { $lte: new Date(now.getTime() - 60_000) } }],
  }, { $set: {
    [hashField]: tokenHash(token),
    [expiryField]: new Date(now.getTime() + (purpose === "verification" ? 24 : 1) * 60 * 60_000),
    [sentField]: now,
  } }, { returnDocument: "after" });
  if (user) {
    try {
      await sendAccountEmail(email, token, purpose);
    } catch (error) {
      await User.updateOne({ _id: user._id, [hashField]: tokenHash(token) }, {
        $set: { [hashField]: null, [expiryField]: null, [sentField]: null },
      });
      throw error;
    }
  }
  return genericEmailMessage;
}

export async function registerAccount(rawName: unknown, rawEmail: unknown, rawPassword: unknown) {
  const name = displayName(rawName);
  const email = emailAddress(rawEmail);
  const password = accountPassword(rawPassword);
  await limitAccountRequest("register", email);
  // Fail before creating a user if the required email setup is absent.
  emailConfiguration();
  applicationUrl();
  await connectToDatabase();
  const passwordHash = await hashPassword(password);
  try {
    await User.create({ name, email, passwordHash });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error;
    // A duplicate signup never changes the existing name or password.
  }
  await requestAccountEmail(email, "verification", true);
  return "Revisa tu correo para verificar tu cuenta. Si ya tienes una cuenta, puedes iniciar sesión o recuperar tu contraseña.";
}

export async function verifyAccountEmail(token: unknown) {
  if (!validToken(token)) throw new AccountError(invalidLinkMessage);
  await consumeRateLimit("global:verify", 100, 60_000);
  const user = await User.findOneAndUpdate({
    verificationTokenHash: tokenHash(token), verificationExpiresAt: { $gt: new Date() }, emailVerifiedAt: null,
  }, { $set: { emailVerifiedAt: new Date(), verificationTokenHash: null, verificationExpiresAt: null } });
  if (!user) throw new AccountError(invalidLinkMessage);
  return "Correo verificado. Ya puedes iniciar sesión.";
}

export async function resetAccountPassword(token: unknown, rawPassword: unknown) {
  if (!validToken(token)) throw new AccountError(invalidLinkMessage);
  const password = accountPassword(rawPassword);
  await consumeRateLimit("global:reset-confirm", 100, 60_000);
  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate({
    resetTokenHash: tokenHash(token), resetExpiresAt: { $gt: new Date() }, emailVerifiedAt: { $ne: null },
  }, {
    $set: { passwordHash, resetTokenHash: null, resetExpiresAt: null },
    $inc: { sessionVersion: 1 },
  });
  if (!user) throw new AccountError(invalidLinkMessage);
  return "Contraseña actualizada. Inicia sesión con tu nueva contraseña.";
}

// A validly shaped dummy hash keeps unknown accounts on the same scrypt path.
const dummyHash = `${"0".repeat(32)}:${"0".repeat(128)}`;

export async function authenticateAccount(rawEmail: unknown, rawPassword: unknown) {
  let email: string;
  let password: string;
  try {
    email = emailAddress(rawEmail);
    password = accountPassword(rawPassword);
  } catch { return null; }
  await limitAccountRequest("sign-in", email);
  const user = await User.findOne({ email }).select("+passwordHash +sessionVersion");
  const matches = await verifyPassword(password, user?.passwordHash || dummyHash);
  if (!user || !matches || !user.emailVerifiedAt) return null;
  return { id: user._id.toString(), name: user.name, email: user.email, sessionVersion: user.sessionVersion };
}
