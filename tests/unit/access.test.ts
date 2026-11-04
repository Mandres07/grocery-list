import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("@/lib/db", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/models/Household", () => ({ default: { findById: vi.fn() } }));
vi.mock("@/models/Membership", () => ({ default: { exists: vi.fn() } }));

import Household from "@/models/Household";
import Membership from "@/models/Membership";
import { requireHouseholdAccess } from "@/lib/households/access";

const ownerId = new Types.ObjectId();
const memberId = new Types.ObjectId();
const householdId = new Types.ObjectId();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Household.findById).mockReturnValue({ select: () => ({ lean: async () => ({ ownerId }) }) } as unknown as ReturnType<typeof Household.findById>);
  vi.mocked(Membership.exists).mockResolvedValue({ _id: new Types.ObjectId() });
});

describe("household authorization", () => {
  it("allows an owner to manage members", async () => {
    await expect(requireHouseholdAccess(ownerId.toString(), householdId.toString(), true)).resolves.toMatchObject({ role: "owner" });
  });

  it("allows a member to access shared inventory", async () => {
    await expect(requireHouseholdAccess(memberId.toString(), householdId.toString())).resolves.toMatchObject({ role: "member" });
    expect(Membership.exists).toHaveBeenCalledWith({ userId: memberId, householdId });
  });

  it("rejects member management by a non-owner", async () => {
    await expect(requireHouseholdAccess(memberId.toString(), householdId.toString(), true)).rejects.toThrow("No tienes permiso");
  });

  it("checks current membership on every call, including for the owner", async () => {
    await expect(requireHouseholdAccess(ownerId.toString(), householdId.toString())).resolves.toBeDefined();
    vi.mocked(Membership.exists).mockResolvedValue(null);
    await expect(requireHouseholdAccess(ownerId.toString(), householdId.toString())).rejects.toThrow("No tienes permiso");
  });

  it("rejects malformed IDs before querying", async () => {
    await expect(requireHouseholdAccess("invalid", householdId.toString())).rejects.toThrow("No tienes permiso");
    expect(Household.findById).not.toHaveBeenCalled();
  });

  it("rejects a missing household even when a membership remains", async () => {
    vi.mocked(Household.findById).mockReturnValue({ select: () => ({ lean: async () => null }) } as unknown as ReturnType<typeof Household.findById>);
    await expect(requireHouseholdAccess(memberId.toString(), householdId.toString())).rejects.toThrow("No tienes permiso");
  });
});
