import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { PasswordField } from "@/components/auth/password-field";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-manrope" }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/app/(account)/actions", () => ({ registerAction: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", unstable_rethrow: vi.fn(), redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }) }));

import RootLayout from "@/app/layout";
import AuthLayout from "@/app/(auth)/layout";
import SignInPage from "@/app/(auth)/sign-in/page";
import { AppHeader } from "@/components/ui/app-header";
import HomePage from "@/app/(auth)/page";
import { getCurrentUser } from "@/lib/auth/session";

beforeEach(() => vi.clearAllMocks());

describe("home onboarding", () => {
  it("keeps the welcome content beside registration and links to login", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const html = renderToStaticMarkup(createElement(AuthLayout, null, await HomePage()));
    expect(html).toContain("Tu hogar,");
    expect(html).toContain("Un poquito de orden, todos los días");
    expect(html).toContain('name="password"');
    expect(html).toContain('method="post"');
    expect(html).toContain("Crear cuenta y entrar");
    expect(html).toContain('href="/sign-in"');
    expect(html).not.toContain("Productos de ejemplo");
    expect(html.indexOf('id="registration"')).toBeLessThan(html.indexOf("Tu despensa y los esenciales"));
  });

  it("never falls back to putting login credentials in a GET URL", () => {
    expect(renderToStaticMarkup(createElement(SignInForm))).toContain('method="post"');
  });

  it("starts password fields concealed and links a non-submit visibility button to the input", () => {
    const html = renderToStaticMarkup(createElement(PasswordField, { id: "new-password", label: "Contraseña", name: "password", autoComplete: "new-password" }));
    expect(html).toContain('type="password"');
    expect(html).toContain('name="password"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-controls="new-password"');
    expect(html).toContain('aria-label="Mostrar contraseña"');
  });

  it("redirects both verified and unverified signed-in users", async () => {
    for (const emailVerified of [true, false]) {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: "a".repeat(24), name: "Ana", email: "ana@example.test", sessionVersion: 0, emailVerified });
      await expect(HomePage()).rejects.toThrow("REDIRECT:/inventory");
      await expect(SignInPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/inventory");
    }
  });
});

describe("shared application header", () => {
  it("renders one identical guest banner for registration and sign in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const home = renderToStaticMarkup(await RootLayout({ children: createElement(AuthLayout, null, await HomePage()) }));
    const login = renderToStaticMarkup(await RootLayout({ children: createElement(AuthLayout, null, await SignInPage({ searchParams: Promise.resolve({}) })) }));
    const banners = (html: string) => html.match(/<header[\s\S]*?<\/header>/g);
    expect(banners(home)).toHaveLength(1);
    expect(banners(login)).toEqual(banners(home));
  });

  it("keeps the page error screen renderable when header account lookup fails", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("Database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const html = renderToStaticMarkup(await RootLayout({ children: "Page unavailable" }));
      expect(html).toContain("Page unavailable");
      expect(html).toContain("Iniciar sesión");
      expect(html).not.toContain('href="/inventory"');
      expect(html).not.toContain('href="/shopping"');
      expect(log).toHaveBeenCalledWith("Header account lookup unavailable");
    } finally { log.mockRestore(); }
  });

  it("offers an accessible account menu and inventory for verified users", () => {
    const html = renderToStaticMarkup(createElement(AppHeader, { user: { name: "Ana", emailVerified: true } }));
    expect(html).toContain('aria-label="Menú de cuenta"');
    expect(html).toContain('aria-label="Mi cuenta"');
    expect(html).toContain('href="/inventory"');
    expect(html).toContain('href="/shopping"');
    expect(html).toContain("Cerrar sesión");
    expect(html).not.toContain("Iniciar sesión");
  });

  it("keeps inventory out of the unverified account menu", () => {
    const html = renderToStaticMarkup(createElement(AppHeader, { user: { name: "Ana", emailVerified: false } }));
    expect(html).toContain('href="/account"');
    expect(html).not.toContain('href="/inventory"');
    expect(html).not.toContain('href="/shopping"');
  });
});

describe("shared authentication layout", () => {
  it("keeps identical welcome content and native links with distinct forms", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const home = renderToStaticMarkup(createElement(AuthLayout, null, await HomePage()));
    const login = renderToStaticMarkup(createElement(AuthLayout, null, await SignInPage({ searchParams: Promise.resolve({}) })));
    const welcome = (html: string) => html.match(/<section aria-labelledby="welcome-title"[\s\S]*?<\/section>/)?.[0];
    expect(welcome(login)).toEqual(welcome(home));
    expect(login.match(/<main\b/g)).toHaveLength(1);
    expect(login.match(/<h1\b/g)).toHaveLength(1);
    expect(login).toContain('href="/"');
    expect(home).toContain('href="/sign-in"');
    expect(login).not.toContain('name="name"');
    expect(home).toContain('name="name"');
    expect(login.indexOf('id="sign-in-title"')).toBeLessThan(login.indexOf("Tu despensa y los esenciales"));
  });

  it("preserves sign-in errors and account recovery links in the shared layout", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const html = renderToStaticMarkup(createElement(AuthLayout, null, await SignInPage({ searchParams: Promise.resolve({ error: "CredentialsSignin" }) })));
    expect(html).toContain("No pudimos iniciar sesión");
    expect(html).toContain('href="/forgot-password"');
    expect(html).toContain('href="/verify-email"');
    expect(html).toContain('method="post"');
  });
});
