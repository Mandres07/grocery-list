// UTC calendar months, clamped to the destination month's last day.
export function sixMonthsAfter(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 6);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

// Legacy records are filtered correctly before the retention backfill is run.
export function unexpiredHistory(dateField: string, now = new Date()) {
  return { $or: [
    { retentionExpiresAt: { $gt: now } },
    { retentionExpiresAt: { $exists: false }, $expr: { $gt: [{ $dateAdd: { startDate: `$${dateField}`, unit: "month", amount: 6 } }, now] } },
  ] };
}
