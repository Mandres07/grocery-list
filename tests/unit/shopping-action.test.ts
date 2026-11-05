import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/session", () => ({ requireVerifiedUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/shopping/mutations", () => ({ addShoppingItem: vi.fn(), addLowStockToShopping: vi.fn(), setShoppingPurchased: vi.fn(), editShoppingQuantity: vi.fn(), deleteShoppingItem: vi.fn(), receiveShoppingItem: vi.fn(), receivePurchasedItems: vi.fn() }));
vi.mock("@/lib/shopping/queries", () => ({ getShoppingItem: vi.fn(), shoppingProductOptions: vi.fn() }));
import { shoppingAction } from "@/app/(account)/shopping/actions";
import { requireVerifiedUser } from "@/lib/auth/session";
import { setShoppingPurchased, receiveShoppingItem, receivePurchasedItems } from "@/lib/shopping/mutations";
import { getShoppingItem } from "@/lib/shopping/queries";
import { revalidatePath } from "next/cache";
import { AccountError } from "@/lib/auth/validation";
const actor = { id: "a".repeat(24), email: "ana@example.test", name: "Ana", sessionVersion: 0, emailVerified: true };
function request(kind = "purchase") {
  const data = new FormData();
  for (const [key, value] of Object.entries({ kind, householdId: "b".repeat(24), itemId: "c".repeat(24), requestId: "retained-shopping-request", revision: "2", purchased: "yes", quantity: "3" })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireVerifiedUser).mockResolvedValue(actor);
  vi.mocked(getShoppingItem).mockResolvedValue({ id: "c".repeat(24), status: "purchased", revision: 3, quantity: 3 });
});
describe("shopping action boundary", () => {
  it("returns authoritative purchase state without receiving any stock", async () => {
    const data = request();
    expect(await shoppingAction({ success: false, message: "" }, data)).toMatchObject({ success: true, item: { status: "purchased", revision: 3, quantity: 3 } });
    expect(setShoppingPurchased).toHaveBeenCalledWith(actor, data.get("householdId"), data.get("requestId"), data.get("itemId"), "2", true, "3");
    expect(receiveShoppingItem).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
  it("rejects a malformed purchased value before mutating", async () => {
    const data = request(); data.set("purchased", "maybe");
    expect(await shoppingAction({ success: false, message: "" }, data)).toMatchObject({ success: false });
    expect(setShoppingPurchased).not.toHaveBeenCalled();
  });
  it("passes explicit receiving quantities to the transaction separately", async () => {
    const data = request("receive");
    expect(await shoppingAction({ success: false, message: "" }, data)).toMatchObject({ success: true });
    expect(receiveShoppingItem).toHaveBeenCalledWith(actor, data.get("householdId"), data.get("requestId"), data.get("itemId"), "2", "3");
    expect(setShoppingPurchased).not.toHaveBeenCalled();
  });
  it("preserves uncertain retry semantics if the confirmation read loses connectivity", async () => {
    vi.mocked(getShoppingItem).mockRejectedValue(new Error("Connection lost"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try { expect(await shoppingAction({ success: false, message: "" }, request())).toMatchObject({ success: false, retryable: true }); }
    finally { log.mockRestore(); }
  });
  it("does not disclose shopping state after losing membership", async () => {
    vi.mocked(getShoppingItem).mockRejectedValue(new AccountError("Ya no tienes acceso."));
    const result = await shoppingAction({ success: false, message: "" }, request());
    expect(result).toMatchObject({ success: false, message: "Ya no tienes acceso." });
    expect(result.item).toBeUndefined();
  });
  it("passes the reviewed batch snapshot to a single receiving transaction", async () => {
    const data = request("receive-batch");
    const selection = JSON.stringify([{ id: "c".repeat(24), revision: 2, quantity: 3 }]);
    data.set("items", selection);
    expect(await shoppingAction({ success: false, message: "" }, data)).toMatchObject({ success: true });
    expect(receivePurchasedItems).toHaveBeenCalledWith(actor, data.get("householdId"), data.get("requestId"), selection);
    expect(receiveShoppingItem).not.toHaveBeenCalled();
  });

});
