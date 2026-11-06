import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireVerifiedUser: vi.fn() }));
vi.mock("@/lib/inventory/queries", () => ({ getInventoryProduct: vi.fn() }));
vi.mock("@/lib/inventory/mutations", () => ({
  adjustStock: vi.fn(), correctStock: vi.fn(), createProduct: vi.fn(), createProducts: vi.fn(), deleteCategory: vi.fn(),
  editProduct: vi.fn(), saveCategory: vi.fn(), setProductArchived: vi.fn(), undoStockMovement: vi.fn(),
}));

import { inventoryAction } from "@/app/(account)/inventory/actions";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getInventoryProduct } from "@/lib/inventory/queries";
import { adjustStock, createProducts } from "@/lib/inventory/mutations";
import { AccountError } from "@/lib/auth/validation";
import { revalidatePath } from "next/cache";

const actor = { id: "a".repeat(24), name: "Ana", email: "ana@example.test", emailVerified: true, sessionVersion: 0 };
function request(delta = "1") {
  const data = new FormData();
  for (const [key, value] of Object.entries({ kind: "adjust-stock", householdId: "b".repeat(24), productId: "c".repeat(24), requestId: "retained-request", delta })) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireVerifiedUser).mockResolvedValue(actor);
  vi.mocked(getInventoryProduct).mockResolvedValue({ id: "c".repeat(24), name: "Arroz", quantity: 11, revision: 2, unit: "bolsas", categoryId: null, lowStockThreshold: null, archived: false });
});

describe("stock adjustment feedback", () => {
  it("returns the authoritative quantity and revision and refreshes the shared application layout", async () => {
    const data = request();
    const result = await inventoryAction({ success: false, message: "" }, data);
    expect(result).toMatchObject({ success: true, stock: { quantity: 11, revision: 2 } });
    expect(adjustStock).toHaveBeenCalledWith(actor, data.get("householdId"), "retained-request", data.get("productId"), 1);
    expect(getInventoryProduct).toHaveBeenCalledWith(actor, data.get("householdId"), data.get("productId"));
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects invalid deltas before changing or reading stock", async () => {
    expect(await inventoryAction({ success: false, message: "" }, request("2"))).toMatchObject({ success: false });
    expect(adjustStock).not.toHaveBeenCalled();
    expect(getInventoryProduct).not.toHaveBeenCalled();
  });

  it("keeps retry semantics when the confirmation read fails after saving", async () => {
    vi.mocked(getInventoryProduct).mockRejectedValue(new Error("Connection lost"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await inventoryAction({ success: false, message: "" }, request());
      expect(adjustStock).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ success: false, retryable: true });
      expect(result.stock).toBeUndefined();
    } finally { log.mockRestore(); }
  });

  it("does not disclose stock after the confirmation read loses access", async () => {
    vi.mocked(getInventoryProduct).mockRejectedValue(new AccountError("Ya no tienes acceso a este hogar."));
    const result = await inventoryAction({ success: false, message: "" }, request());
    expect(result).toMatchObject({ success: false, message: "Ya no tienes acceso a este hogar." });
    expect(result.stock).toBeUndefined();
  });
});

describe("bulk product submission", () => {
  it("sends ordered rows and one shared category to a single mutation", async () => {
    const data = request();
    data.set("kind", "create-products");
    data.set("categoryId", "d".repeat(24));
    for (const row of [["Arroz", "2", "1"], ["Leche", "0", ""]]) {
      data.append("names", row[0]); data.append("quantities", row[1]); data.append("thresholds", row[2]);
    }
    expect(await inventoryAction({ success: false, message: "" }, data)).toMatchObject({ success: true });
    expect(createProducts).toHaveBeenCalledExactlyOnceWith(actor, data.get("householdId"), "retained-request", {
      categoryId: "d".repeat(24), names: ["Arroz", "Leche"], quantities: ["2", "0"], thresholds: ["1", ""],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns row validation errors without revalidating inventory", async () => {
    vi.mocked(createProducts).mockRejectedValue(new AccountError("Producto 2: Escribe un nombre."));
    const data = request(); data.set("kind", "create-products");
    expect(await inventoryAction({ success: false, message: "" }, data)).toEqual({ success: false, message: "Producto 2: Escribe un nombre." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
