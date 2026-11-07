import type { mongo } from "mongoose";

// Idempotent backfill: never extend an existing expiration or touch active lists.
export async function backfillRetention(database: mongo.Db) {
  const targets = [
    { collection: "stockmovements", date: "createdAt", filter: {} },
    { collection: "inventoryrequests", date: "createdAt", filter: {} },
    { collection: "shoppingitems", date: "receivedAt", filter: { status: "received" } },
    { collection: "invitations", date: "expiresAt", filter: {} },
  ];
  const counts: Record<string, number> = {};
  for (const target of targets) {
    const result = await database.collection(target.collection).updateMany({
      ...target.filter, retentionExpiresAt: { $exists: false }, [target.date]: { $type: "date" },
    }, [{ $set: { retentionExpiresAt: { $dateAdd: { startDate: `$${target.date}`, unit: "month", amount: 6 } } } }]);
    counts[target.collection] = result.modifiedCount;
  }
  return counts;
}
