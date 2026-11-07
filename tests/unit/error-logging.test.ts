import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logAppError, withErrorReference } from "@/lib/error-logging";
import { onRequestError } from "@/instrumentation";

let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => { log = vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());
const entry = () => JSON.parse(log.mock.calls.at(-1)![0]);

describe("application error logging", () => {
  it("writes searchable JSON and returns the same opaque reference across boundaries", () => {
    const error = Object.assign(new Error("private message"), { name: "StrictModeError", path: "retentionExpiresAt", code: 123 });
    const id = logAppError("shopping.submit", error, { action: "receive-batch" });
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    expect(entry()).toMatchObject({ event: "application.error", level: "error", errorId: id, operation: "shopping.submit", action: "receive-batch", error: { name: "StrictModeError", path: "retentionExpiresAt", code: 123 } });
    expect(Number.isNaN(Date.parse(entry().timestamp))).toBe(false);
    expect(logAppError("server.request", error)).toBe(id);
    expect(withErrorReference("Intenta de nuevo.", error)).toBe(`Intenta de nuevo. Referencia: ${id}.`);
  });
  it("does not log error messages, stacks, payloads, arbitrary metadata or nested secrets", () => {
    const secret = "mongodb://user:password@private.example/?token=secret";
    const error = Object.assign(new Error(secret), { name: secret, path: secret, code: secret, digest: secret, errors: { quantity: { value: secret, message: secret }, [secret]: { value: secret } }, cause: { message: secret, code: "ECONNREFUSED" } });
    logAppError("inventory.submit", error, { action: secret, route: `/reset-password?token=${secret}` });
    expect(log.mock.calls[0][0]).not.toContain(secret);
    expect(entry().error).toEqual({ name: "Error", fields: ["quantity"] });
    expect(entry()).not.toHaveProperty("action");
    expect(entry()).not.toHaveProperty("route");
  });
  it("reports safe validation field names and network cause codes without values", () => {
    logAppError("email.invitation", Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET", address: "private" } }), { status: 503 });
    expect(entry()).toMatchObject({ status: 503, error: { name: "TypeError", code: "ECONNRESET" } });
    expect(log.mock.calls[0][0]).not.toContain("private");
  });
  it.each([null, undefined, "secret thrown value", 42])("handles thrown values without serializing them: %s", error => {
    const id = logAppError("auth.sign-in", error);
    expect(entry()).toMatchObject({ errorId: id, error: { name: "Error" } });
    expect(withErrorReference("Intenta de nuevo.", error, id)).toBe(`Intenta de nuevo. Referencia: ${id}.`);
    expect(withErrorReference("Validation message", new Error())).toBe("Validation message");
  });
  it("logs framework route patterns and digest while excluding all request data", () => {
    const error = Object.assign(new Error("private render data"), { digest: "123456789" });
    onRequestError(error, { path: "/verify-email?token=secret", method: "GET", headers: { cookie: "session=secret" } }, { routerKind: "App Router", routePath: "/app/inventory/[productId]/page", routeType: "render", revalidateReason: undefined });
    expect(entry()).toMatchObject({ operation: "server.request", route: "/app/inventory/[productId]/page", routeType: "render", error: { digest: "123456789" } });
    expect(log.mock.calls[0][0]).not.toContain("secret");
    expect(log.mock.calls[0][0]).not.toContain("private render data");
  });
});
