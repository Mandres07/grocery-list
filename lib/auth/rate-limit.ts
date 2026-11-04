import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import AuthRateLimit from "@/models/AuthRateLimit";
import { AccountError } from "./validation";

// MongoDB shares the budget across workers. Fixed-window IDs remain safe even
// when MongoDB's TTL cleanup has not removed the previous window yet.
export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  await connectToDatabase();
  const window = Math.floor(Date.now() / windowMs);
  const id = createHash("sha256").update(`${key}:${window}`).digest("hex");
  let record;
  try {
    record = await AuthRateLimit.findOneAndUpdate({ _id: id }, {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) },
    }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    // Concurrent first requests can race on the unique _id during upsert.
    if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error;
    record = await AuthRateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { returnDocument: "after" });
  }
  if (!record || record.count > limit) throw new AccountError("Demasiados intentos. Espera unos minutos y vuelve a intentar.");
}

export async function limitAccountRequest(operation: string, email: string) {
  await consumeRateLimit(`global:${operation}`, 100, 60_000);
  await consumeRateLimit(`${operation}:${email}`, 5, 15 * 60_000);
}
