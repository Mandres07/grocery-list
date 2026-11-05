import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QuantityInput } from "@/components/ui/quantity-input";

function render(value: string, disabled = false) {
  return renderToStaticMarkup(createElement(QuantityInput, { label: "Arroz", value, onChange: vi.fn(), form: "purchase", disabled }));
}
function buttons(html: string) { return html.match(/<button\b[^>]*>/g) ?? []; }

describe("editable quantity controls", () => {
  it.each([
    { value: "1", minusDisabled: true, plusDisabled: false },
    { value: String(Number.MAX_SAFE_INTEGER), minusDisabled: false, plusDisabled: true },
  ])("protects the boundary $value and preserves direct numeric entry", ({ value, minusDisabled, plusDisabled }) => {
    const html = render(value);
    const [minus, plus] = buttons(html);
    expect(minus?.includes("disabled")).toBe(minusDisabled);
    expect(plus?.includes("disabled")).toBe(plusDisabled);
    expect(html).toContain('type="number"');
    expect(html).toContain('form="purchase"');
    expect(html).toContain('name="quantity"');
    expect(html).toContain('aria-label="Cantidad de Arroz"');
    expect(buttons(html).every((button) => button.includes('type="button"'))).toBe(true);
  });
  it("freezes both buttons and entry while a purchase is unresolved", () => {
    const html = render("2", true);
    expect(buttons(html).every((button) => button.includes("disabled"))).toBe(true);
    expect(html.match(/<input\b[^>]*>/)?.[0]).toContain("disabled");
  });
  it("allows an empty field to be corrected without stepping an invalid quantity", () => {
    const html = render("");
    expect(buttons(html).every((button) => button.includes("disabled"))).toBe(true);
    expect(html.match(/<input\b[^>]*>/)?.[0]).toContain("required");
    expect(html.match(/<input\b[^>]*>/)?.[0]).not.toContain("disabled");
  });
});
