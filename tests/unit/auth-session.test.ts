import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/models/User", () => ({ default: { findById: vi.fn() } }));

import { getServerSession } from "next-auth";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser, getVerifiedUser } from "@/lib/auth/session";

const id = new Types.ObjectId();
function userRecord(record: object | null) {
  vi.mocked(User.findById).mockReturnValue({ select: () => ({ lean: async () => record ? { _id: id, name: "Ana", email: "ana@example.test", ...record } : null }) } as unknown as ReturnType<typeof User.findById>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: id.toString(), sessionVersion: 2 } });
  userRecord({ _id: id, name: "Ana", email: "ana@example.test", emailVerifiedAt: new Date(), sessionVersion: 2 });
});

describe("verified session boundary", () => {
  it("requires a session before accessing the database", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect(await getVerifiedUser()).toBeNull();
    expect(connectToDatabase).not.toHaveBeenCalled();
  });

  it("returns only the authenticated user's public identity", async () => {
    expect(await getVerifiedUser()).toEqual({ id: id.toString(), name: "Ana", email: "ana@example.test", sessionVersion: 2, emailVerified: true });
  });

  it("rejects deleted and unverified accounts, and sessions invalidated by reset", async () => {
    for (const record of [null, { emailVerifiedAt: null, sessionVersion: 2 }, { emailVerifiedAt: new Date(), sessionVersion: 3 }]) {
      userRecord(record);
      expect(await getVerifiedUser()).toBeNull();
    }
  });

  it("fails closed when MongoDB is unavailable", async () => {
    vi.mocked(connectToDatabase).mockRejectedValueOnce(new Error("unavailable"));
    await expect(getVerifiedUser()).rejects.toThrow("unavailable");
  });

  it("keeps an unverified user signed in without granting verified access", async () => {
    userRecord({ _id: id, name: "Ana", email: "ana@example.test", emailVerifiedAt: null, sessionVersion: 2 });
    expect(await getCurrentUser()).toMatchObject({ id: id.toString(), emailVerified: false });
    expect(await getVerifiedUser()).toBeNull();
  });
});
