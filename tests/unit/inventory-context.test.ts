import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ requireVerifiedUser: vi.fn() }));
vi.mock("@/lib/inventory/default-categories", () => ({ ensureDefaultCategories: vi.fn() }));
vi.mock("@/models/Membership", () => ({ default: { findOne: vi.fn() } }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));

import { inventoryPageContext } from "@/lib/inventory/page-context";
import { requireVerifiedUser } from "@/lib/auth/session";
import { ensureDefaultCategories } from "@/lib/inventory/default-categories";
import Membership from "@/models/Membership";
const user = { id: "a".repeat(24), name: "Ana", email: "ana@example.test", sessionVersion: 0, emailVerified: true };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireVerifiedUser).mockResolvedValue(user); });

describe("inventory landing prerequisites", () => {
  it("keeps household setup accessible without a membership", async () => {
    vi.mocked(Membership.findOne).mockReturnValue({ lean: async () => null } as never);
    await expect(inventoryPageContext()).rejects.toThrow("redirect:/household");
    expect(ensureDefaultCategories).not.toHaveBeenCalled();
  });
  it("loads the existing household for a ready account", async () => {
    const householdId = "b".repeat(24);
    vi.mocked(Membership.findOne).mockReturnValue({ lean: async () => ({ householdId }) } as never);
    await expect(inventoryPageContext()).resolves.toEqual({ user, householdId });
    expect(ensureDefaultCategories).toHaveBeenCalledWith(user, householdId);
  });
  it("preserves verification before any inventory lookup", async () => {
    vi.mocked(requireVerifiedUser).mockRejectedValue(new Error("redirect:/household"));
    await expect(inventoryPageContext()).rejects.toThrow("redirect:/household");
    expect(Membership.findOne).not.toHaveBeenCalled();
  });
});
