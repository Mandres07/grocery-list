import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildActionEmail } from "@/lib/email/template";
import theme from "@/styles/theme.json";

describe("shared email branding", () => {
  it("includes the Spanish brand, basket, action, fallback link, and plain text", () => {
    const content = buildActionEmail({ subject: "Una invitación", title: "Comparte tu hogar", description: "Para toda la familia", actionLabel: "Aceptar invitación", url: "https://example.test/invitation?token=123", expiry: "Vence en siete días." });
    expect(content.html).toContain("Lista de Compras");
    expect(content.html).toContain('src="cid:brand-basket"');
    expect(content.html).toContain(theme.colors.brand);
    expect(content.html).toContain(theme.colors.background);
    expect(content.html).toContain(`bgcolor="${theme.colors.brand}"`);
    expect(content.html).toContain("Aceptar invitación");
    expect(content.html).toContain("Si el botón no funciona");
    expect(content.text).toContain("https://example.test/invitation?token=123");
    expect(content.text).toContain("Vence en siete días.");
    expect(content.text).not.toContain("<table");
  });

  it("escapes household names and URL attributes", () => {
    const content = buildActionEmail({ subject: '<script>alert("x")</script>', title: "<b>Casa</b>", description: '<img src=x onerror="alert(1)">', actionLabel: "Entrar", url: 'https://example.test/?a=1&b="test"', expiry: "Siete días" });
    expect(content.html).not.toContain("<script>");
    expect(content.html).not.toContain("<b>Casa</b>");
    expect(content.html).not.toContain("<img src=x");
    expect(content.html).toContain("&lt;img");
    expect(content.html).toContain("&amp;b=&quot;test&quot;");
  });

  it("keeps the generated CSS in sync with the same email theme tokens", () => {
    const css = readFileSync(new URL("../../styles/theme.generated.css", import.meta.url), "utf8");
    for (const [name, value] of Object.entries(theme.colors)) expect(css).toContain(`--${name}: ${value};`);
    for (const [name, value] of Object.entries(theme.sizes)) expect(css).toContain(`--size-${name}: ${value};`);
  });
});
