import { describe, expect, it } from "vitest";
import { accountPassword, displayName, emailAddress, validToken } from "@/lib/auth/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("account credentials", () => {
  it("normalizes emails and names without changing passwords", () => {
    expect(emailAddress(" Person@Example.com ")).toBe("person@example.com");
    expect(displayName(" Mi hogar ")).toBe("Mi hogar");
    expect(accountPassword(" long passphrase ")).toBe(" long passphrase ");
  });

  it("rejects missing, malformed, empty and oversized inputs", () => {
    for (const email of [null, "no-email", "a".repeat(250) + "@example.com"]) expect(() => emailAddress(email)).toThrow();
    for (const password of [null, "short", " ".repeat(12), "a".repeat(129)]) expect(() => accountPassword(password)).toThrow();
    for (const name of [null, " ", "a".repeat(101)]) expect(() => displayName(name)).toThrow();
    expect(validToken("a".repeat(64))).toBe(true);
    for (const token of [undefined, ["a".repeat(64)], "a".repeat(63), "z".repeat(64)]) expect(validToken(token)).toBe(false);
  });

  it("uses unique salts, verifies the exact password, and rejects malformed hashes", async () => {
    const password = "a memorable phrase";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword("wrong password", first)).toBe(false);
    for (const hash of ["", "salt:hash", "a:b:c"]) expect(await verifyPassword(password, hash)).toBe(false);
  });
});
