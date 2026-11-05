import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth/session", () => ({ requireSignedInUser: vi.fn() }));
vi.mock("@/app/(account)/actions", () => ({ updateNameAction: vi.fn(), createHouseholdAction: vi.fn(), resendVerificationAction: vi.fn() }));
vi.mock("@/lib/households/access", () => ({ requireHouseholdAccess: vi.fn() }));
vi.mock("@/models/Membership", () => ({ default: { findOne: vi.fn() } }));
vi.mock("@/models/Household", () => ({ default: { findById: vi.fn() } }));
vi.mock("@/lib/households/invitation-context", () => ({ pendingInvitationToken: vi.fn() }));
vi.mock("@/lib/households/family", () => ({ getFamilyInvitation: vi.fn() }));
vi.mock("@/app/(account)/household/actions", () => ({ renameHouseholdAction: vi.fn() }));

import AccountPage from "@/app/(account)/account/page";
import HouseholdPage from "@/app/(account)/household/page";
import { requireSignedInUser } from "@/lib/auth/session";
import { requireHouseholdAccess } from "@/lib/households/access";
import Membership from "@/models/Membership";
import Household from "@/models/Household";

const user = { id: "a".repeat(24), name: "Ana", email: "ana@example.test", sessionVersion: 0, emailVerified: true };
const householdId = "b".repeat(24);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireSignedInUser).mockResolvedValue(user);
  vi.mocked(Membership.findOne).mockReturnValue({ lean: async () => ({ householdId }) } as never);
  vi.mocked(Household.findById).mockReturnValue({ lean: async () => ({ _id: householdId, name: "Casa compartida", ownerId: user.id }) } as never);
});

describe("account and household settings", () => {
  it("prefills the name and keeps profile/security actions in shared panels", async () => {
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toContain('value="Ana"');
    expect(html).toContain("Correo verificado");
    expect(html).toContain('href="/forgot-password"');
    expect(html).toContain("Guardar nombre");
    expect(html).toContain("panel-grid");
    expect(html).not.toMatch(/<form[^>]*class="[^"]*surface-raised/);
  });
  it("keeps verification actions available to an unverified account", async () => {
    vi.mocked(requireSignedInUser).mockResolvedValue({ ...user, emailVerified: false });
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toContain("Pendiente de verificación");
    expect(html).toContain("Enviar otro enlace");
  });
  it("offers family management to the owner after checking access", async () => {
    const html = renderToStaticMarkup(await HouseholdPage());
    expect(requireHouseholdAccess).toHaveBeenCalledWith(user.id, householdId);
    expect(html).toContain("Casa compartida");
    expect(html).toContain("Propietario");
    expect(html).toContain('href="/family"');
    expect(html).toContain('href="/inventory"');
    expect(html).toContain('value="Casa compartida"');
    expect(html).toContain("Guardar nombre del hogar");
    expect(html).toContain(`name="householdId" value="${householdId}"`);
    expect(html).not.toContain("siguiente paso");
  });
  it("shows the member role without owner management actions", async () => {
    vi.mocked(Household.findById).mockReturnValue({ lean: async () => ({ name: "Casa compartida", ownerId: "c".repeat(24) }) } as never);
    const html = renderToStaticMarkup(await HouseholdPage());
    expect(html).toContain("Miembro");
    expect(html).not.toContain('href="/family"');
    expect(html).not.toContain("Guardar nombre del hogar");
    expect(html).toContain("Solo la persona propietaria puede cambiar el nombre");
    expect(html).toContain("Ver productos compartidos");
  });
  it("keeps household creation and invitation guidance together for new accounts", async () => {
    vi.mocked(Membership.findOne).mockReturnValue({ lean: async () => null } as never);
    const html = renderToStaticMarkup(await HouseholdPage());
    expect(html).toContain("Crear mi hogar");
    expect(html).toContain("Nombre del hogar");
    expect(html).toContain("enlace de invitación");
    expect(requireHouseholdAccess).not.toHaveBeenCalled();
  });
});
