import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
import { usePathname } from "next/navigation";
import { NavigationLink } from "@/components/ui/navigation-link";

describe("shared navigation state", () => {
  it.each(["/inventory", "/inventory/categories", "/inventory/activity"])("marks inventory active at %s", (path) => {
    vi.mocked(usePathname).mockReturnValue(path);
    expect(renderToStaticMarkup(createElement(NavigationLink, { href: "/inventory", className: "navigation-link" }, "Inventario"))).toContain('aria-current="page"');
  });
  it("does not activate unrelated or similarly prefixed pages", () => {
    for (const path of ["/account", "/household", "/inventory-other"]) {
      vi.mocked(usePathname).mockReturnValue(path);
      expect(renderToStaticMarkup(createElement(NavigationLink, { href: "/inventory", className: "navigation-link" }, "Inventario"))).not.toContain("aria-current");
    }
  });
});
