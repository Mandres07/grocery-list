import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/app/(account)/actions", () => ({ registerAction: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }) }));

import HomePage from "@/app/page";
import { getCurrentUser } from "@/lib/auth/session";

beforeEach(() => vi.clearAllMocks());

describe("home onboarding", () => {
  it("keeps the welcome content beside registration and links to login", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Tu hogar,");
    expect(html).toContain("Un poquito de orden, todos los días");
    expect(html).toContain('name="password"');
    expect(html).toContain('method="post"');
    expect(html).toContain("Crear cuenta y entrar");
    expect(html).toContain('href="/sign-in"');
    expect(html).not.toContain("Productos de ejemplo");
  });

  it("never falls back to putting login credentials in a GET URL", () => {
    expect(renderToStaticMarkup(createElement(SignInForm))).toContain('method="post"');
  });

  it("redirects both verified and unverified signed-in users", async () => {
    for (const emailVerified of [true, false]) {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: "a".repeat(24), name: "Ana", email: "ana@example.test", sessionVersion: 0, emailVerified });
      await expect(HomePage()).rejects.toThrow("REDIRECT:/household");
    }
  });
});
