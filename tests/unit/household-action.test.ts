import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireVerifiedUser: vi.fn() }));
vi.mock("@/lib/households/update", () => ({ renameHousehold: vi.fn() }));

import { renameHouseholdAction } from "@/app/(account)/household/actions";
import { requireVerifiedUser } from "@/lib/auth/session";
import { renameHousehold } from "@/lib/households/update";
import { HouseholdAccessError } from "@/lib/households/access";
import { AccountError } from "@/lib/auth/validation";
import { revalidatePath } from "next/cache";

const actor = { id: "a".repeat(24), name: "Ana", email: "ana@example.test", emailVerified: true, sessionVersion: 0 };
const initial = { success: false, message: "" };
function request() {
  const data = new FormData();
  data.set("householdId", "b".repeat(24));
  data.set("name", "Casa nueva");
  data.set("userId", "untrusted-user");
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireVerifiedUser).mockResolvedValue(actor);
  vi.mocked(renameHousehold).mockResolvedValue("Nombre del hogar actualizado.");
});

describe("household rename action", () => {
  it("uses server identity and refreshes shared views after saving", async () => {
    expect(await renameHouseholdAction(initial, request())).toEqual({ success: true, message: "Nombre del hogar actualizado." });
    expect(renameHousehold).toHaveBeenCalledWith(actor, "b".repeat(24), "Casa nueva");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects requests without a household identifier", async () => {
    const data = request();
    data.delete("householdId");
    expect(await renameHouseholdAction(initial, data)).toMatchObject({ success: false });
    expect(renameHousehold).not.toHaveBeenCalled();
  });

  it.each([new AccountError("Nombre inválido"), new HouseholdAccessError()])("returns validation and access errors without refreshing", async (error) => {
    vi.mocked(renameHousehold).mockRejectedValue(error);
    expect(await renameHouseholdAction(initial, request())).toEqual({ success: false, message: error.message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("keeps unexpected database errors private and permits retrying", async () => {
    vi.mocked(renameHousehold).mockRejectedValue(new Error("private database details"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await renameHouseholdAction(initial, request());
      expect(result).toMatchObject({ success: false });
      expect(result.message).toContain("Intenta de nuevo");
      expect(result.message).not.toContain("private");
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });

  it("requires authentication before calling the mutation", async () => {
    vi.mocked(requireVerifiedUser).mockRejectedValue(new Error("sign-in required"));
    await expect(renameHouseholdAction(initial, request())).rejects.toThrow("sign-in required");
    expect(renameHousehold).not.toHaveBeenCalled();
  });
});
