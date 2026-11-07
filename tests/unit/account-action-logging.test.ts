import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireVerifiedUser: vi.fn(), requireSignedInUser: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/accounts", () => ({ registerAccount: vi.fn(), requestAccountEmail: vi.fn(), resetAccountPassword: vi.fn(), verifyAccountEmail: vi.fn() }));
vi.mock("@/lib/households/family", () => ({ inviteFamilyMember: vi.fn(), removeFamilyMember: vi.fn(), revokeFamilyInvitation: vi.fn(), acceptFamilyInvitation: vi.fn(), getFamilyInvitation: vi.fn() }));

import { registerAction, forgotPasswordAction, resendVerificationAction } from "@/app/(account)/actions";
import { inviteMemberAction, removeMemberAction } from "@/app/(account)/family/actions";
import { registerAccount, requestAccountEmail } from "@/lib/auth/accounts";
import { inviteFamilyMember, removeFamilyMember } from "@/lib/households/family";
import { requireVerifiedUser } from "@/lib/auth/session";
import { AccountError } from "@/lib/auth/validation";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireVerifiedUser).mockResolvedValue({ id: "a".repeat(24), sessionVersion: 0, name: "Test", email: "private@example.test", emailVerified: true });
});

describe("operation-specific action logs", () => {
  it.each([
    { action: registerAction, dependency: registerAccount, operation: "account.register" },
    { action: forgotPasswordAction, dependency: requestAccountEmail, operation: "account.reset-request" },
    { action: resendVerificationAction, dependency: requestAccountEmail, operation: "account.verification-request" },
    { action: inviteMemberAction, dependency: inviteFamilyMember, operation: "family.invite" },
    { action: removeMemberAction, dependency: removeFamilyMember, operation: "family.remove-member" },
  ])("identifies $operation without disclosing submitted data", async ({ action, dependency, operation }) => {
    vi.mocked(dependency).mockRejectedValue(new Error("private database credentials"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const data = new FormData();
      data.set("email", "private@example.test"); data.set("password", "private password");
      data.set("householdId", "b".repeat(24)); data.set("memberId", "c".repeat(24));
      const result = await action({ success: false, message: "" }, data);
      const entry = JSON.parse(log.mock.calls[0][0]);
      expect(entry.operation).toBe(operation);
      expect(result.message).toContain(entry.errorId);
      expect(result.success).toBe(false);
      expect(log.mock.calls[0][0]).not.toContain("private");
    } finally { log.mockRestore(); }
  });
  it("provides a reportable reference even when a dependency throws a primitive", async () => {
    vi.mocked(registerAccount).mockRejectedValue("private thrown value");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await registerAction({ success: false, message: "" }, new FormData());
      const entry = JSON.parse(log.mock.calls[0][0]);
      expect(result.message).toContain(entry.errorId);
      expect(log.mock.calls[0][0]).not.toContain("private thrown value");
    } finally { log.mockRestore(); }
  });
  it("returns expected validation errors without creating error logs", async () => {
    vi.mocked(registerAccount).mockRejectedValue(new AccountError("Contraseña inválida"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await registerAction({ success: false, message: "" }, new FormData())).toEqual({ success: false, message: "Contraseña inválida" });
      expect(log).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
