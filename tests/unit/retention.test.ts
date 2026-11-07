import { describe, expect, it } from "vitest";
import { sixMonthsAfter } from "@/lib/retention";
import { createInventoryRequestId, isFreshInventoryRequest, requestIssuedAt, REQUEST_LIFETIME_MS, REQUEST_CLOCK_SKEW_MS } from "@/lib/inventory/request-id";
import { StockMovement, ShoppingItem, Invitation } from "@/models";
import InventoryRequest from "@/models/InventoryRequest";

const nonce = "12345678-1234-4123-8123-123456789abc";
const now = Date.UTC(2026, 10, 6, 12);
const request = (time: number) => `v1_${time}_${nonce}`;

describe("six calendar month retention", () => {
  it.each([
    ["2026-08-31T12:34:56.789Z", "2027-02-28T12:34:56.789Z"],
    ["2023-08-31T12:00:00.000Z", "2024-02-29T12:00:00.000Z"],
    ["2026-11-06T23:00:00.000Z", "2027-05-06T23:00:00.000Z"],
  ])("expires %s at %s without mutating the original", (start, end) => {
    const date = new Date(start);
    expect(sixMonthsAfter(date).toISOString()).toBe(end);
    expect(date.toISOString()).toBe(start);
  });
  it("defines TTL indexes for historical collections without expiring active shopping by default", () => {
    for (const model of [StockMovement, ShoppingItem, Invitation, InventoryRequest]) {
      expect(model.schema.indexes()).toContainEqual([{ retentionExpiresAt: 1 }, { expireAfterSeconds: 0 }]);
    }
    expect(new ShoppingItem({ status: "pending" }).retentionExpiresAt).toBeUndefined();
    expect(new ShoppingItem({ status: "purchased" }).retentionExpiresAt).toBeUndefined();
  });
});

describe("expiring mutation identities", () => {
  it("generates distinct timestamped identities that work on the server and client", () => {
    const first = createInventoryRequestId();
    expect(isFreshInventoryRequest(first)).toBe(true);
    expect(first).not.toBe(createInventoryRequestId());
    expect(requestIssuedAt(first)).not.toBeNull();
  });
  it("rejects expired, future and legacy keys independently of stored request records", () => {
    expect(isFreshInventoryRequest(request(now), now)).toBe(true);
    expect(isFreshInventoryRequest(request(now - REQUEST_LIFETIME_MS + 1), now)).toBe(true);
    expect(isFreshInventoryRequest(request(now - REQUEST_LIFETIME_MS), now)).toBe(false);
    expect(isFreshInventoryRequest(request(now + REQUEST_CLOCK_SKEW_MS), now)).toBe(true);
    expect(isFreshInventoryRequest(request(now + REQUEST_CLOCK_SKEW_MS + 1), now)).toBe(false);
    for (const value of [nonce, "legacy-command", "v1_bad", request(now).slice(0, -1)]) expect(isFreshInventoryRequest(value, now)).toBe(false);
  });
});
