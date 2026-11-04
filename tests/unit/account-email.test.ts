import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applicationUrl, emailConfiguration, sendAccountEmail, sendInvitationEmail } from "@/lib/email/account-email";

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3001");
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Lista de Compras <no-reply@updates.finalscore.win>");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("account email delivery", () => {
  it("uses the configured app URL and sender for verification and recovery", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    for (const purpose of ["verification", "reset"] as const) {
      await sendAccountEmail("ana@example.test", "a".repeat(64), purpose);
      const [endpoint, request] = fetchMock.mock.calls.at(-1)!;
      expect(endpoint).toBe("https://api.resend.com/emails");
      const body = JSON.parse(request.body);
      expect(body.from).toBe("Lista de Compras <no-reply@updates.finalscore.win>");
      expect(body.html).toContain("Lista de Compras");
      expect(body.html).not.toContain("GroceryList");
      expect(body.attachments[0]).toMatchObject({ filename: "canasta.png", content_id: "brand-basket" });
      expect(Buffer.from(body.attachments[0].content, "base64").subarray(1, 4).toString()).toBe("PNG");
      expect(body.to).toEqual(["ana@example.test"]);
      expect(body.text).toContain(`http://localhost:3001/${purpose === "verification" ? "verify-email" : "reset-password"}?token=`);
    }
  });

  it("sends branded invitations using the same sender and inline basket", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await sendInvitationEmail("family@example.test", "b".repeat(64), 'Casa <script>alert("x")</script>');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.subject).toContain("Lista de Compras");
    expect(body.text).toContain("http://localhost:3001/invitation?token=");
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.html).toContain("cid:brand-basket");
    expect(body.attachments[0].content_id).toBe("brand-basket");
  });

  it("rejects missing credentials and unsafe production origins or senders", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(() => emailConfiguration()).toThrow("configurado");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => applicationUrl()).toThrow("HTTPS");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev");
    expect(() => emailConfiguration()).toThrow("verified");
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.test");
    expect(applicationUrl().origin).toBe("https://app.example.test");
    vi.stubEnv("NEXTAUTH_URL", "https://user:secret@app.example.test/path");
    expect(() => applicationUrl()).toThrow();
  });

  it("reports provider rejection without exposing its body", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(sendAccountEmail("ana@example.test", "a".repeat(64), "verification")).rejects.toThrow("No pudimos enviar");
    expect(log).toHaveBeenCalledWith("Account email rejected by Resend", { status: 403 });
  });
});
