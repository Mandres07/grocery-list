import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(storedHash)) return false;
  const [salt, hash] = storedHash.split(":");
  const key = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(Buffer.from(hash, "hex"), key);
}
