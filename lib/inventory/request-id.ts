export const REQUEST_LIFETIME_MS = 24 * 60 * 60_000;
export const REQUEST_CLOCK_SKEW_MS = 5 * 60_000;

// Keep the timestamp in the identity: changing it creates a different command,
// never renews the original command's deduplication key.
export function createInventoryRequestId() {
  return `v1_${Date.now()}_${crypto.randomUUID()}`;
}

export function requestIssuedAt(requestId: string) {
  const match = /^v1_(\d{13})_([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i.exec(requestId);
  return match ? Number(match[1]) : null;
}

export function isFreshInventoryRequest(requestId: string, now = Date.now()) {
  const issuedAt = requestIssuedAt(requestId);
  return issuedAt !== null && issuedAt <= now + REQUEST_CLOCK_SKEW_MS && issuedAt + REQUEST_LIFETIME_MS > now;
}
