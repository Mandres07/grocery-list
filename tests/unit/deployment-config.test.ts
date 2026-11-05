import { describe, expect, it } from "vitest";
import { deploymentEnvironment, deploymentOrigin } from "../../scripts/prepare-vercel-env.mjs";

const values = {
  MONGODB_URI: "mongodb+srv://lista-maintenance:maintenance-secret@example.test/?retryWrites=true",
  ATLAS_PREVIEW_PASSWORD: "preview@#/%", ATLAS_PRODUCTION_PASSWORD: "production@#/%",
  RESEND_API_KEY: "re_test_example", RESEND_FROM_EMAIL: "Lista de Compras <no-reply@sender.example.test>",
  NEXTAUTH_SECRET: "local-secret-must-not-be-copied", ATLAS_ADMIN_PASSWORD: "must-not-be-copied",
};
const secret = "a-unique-generated-secret-for-the-hosted-environment";

describe("hosted deployment configuration", () => {
  it.each(["http://example.test", "https://example.test/path", "https://user:password@example.test", "https://example.test/?q=x", "https://example.test/#token", "https://localhost"])("rejects an unsafe canonical origin %s", origin => {
    expect(() => deploymentOrigin(origin)).toThrow();
  });
  it.each(["production", "preview"] as const)("uses only the %s app identity and database", stage => {
    const config = deploymentEnvironment(stage, "https://app.example.test", values, secret);
    const uri = new URL(config.MONGODB_URI);
    expect(uri.username).toBe(stage === "production" ? "lista-production" : "lista-preview");
    expect(decodeURIComponent(uri.password)).toBe(stage === "production" ? values.ATLAS_PRODUCTION_PASSWORD : values.ATLAS_PREVIEW_PASSWORD);
    expect(uri.searchParams.get("authSource")).toBe("admin");
    expect(config.MONGODB_DB_NAME).toBe(`grocery_list_${stage}`);
    expect(config.NEXTAUTH_URL).toBe("https://app.example.test");
    expect(config.NEXTAUTH_SECRET).toBe(secret);
    expect(config).not.toHaveProperty("ATLAS_ADMIN_PASSWORD");
    expect(config).not.toHaveProperty("ATLAS_PREVIEW_PASSWORD");
    expect(JSON.stringify(config)).not.toContain("maintenance-secret");
  });
  it("refuses missing credentials, short secrets, and unverified default email senders", () => {
    expect(() => deploymentEnvironment("production", "https://app.example.test", { ...values, ATLAS_PRODUCTION_PASSWORD: "" }, secret)).toThrow();
    expect(() => deploymentEnvironment("production", "https://app.example.test", values, "short")).toThrow();
    expect(() => deploymentEnvironment("production", "https://app.example.test", { ...values, RESEND_FROM_EMAIL: "test@resend.dev" }, secret)).toThrow();
  });
});
