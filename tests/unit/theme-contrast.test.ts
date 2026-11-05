import { describe, expect, it } from "vitest";
import theme from "@/styles/theme.json";

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

describe("theme text contrast", () => {
  it.each([
    ["surface", "brand"],
    ["surface", "brand-hover"],
    ["accent", "accent-soft"],
    ["warning", "warning-soft"],
    ["foreground", "background"],
    ["background", "brand"],
    ["brand", "accent-soft"],
    ["muted", "surface"],
    ["muted", "background"],
    ["muted", "surface-muted"],
    ["muted", "sage"],
  ] as const)("keeps %s text readable on %s", (text, background) => {
    const values = [luminance(theme.colors[text]), luminance(theme.colors[background])].sort((a, b) => a - b);
    expect((values[1] + 0.05) / (values[0] + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("form control boundary contrast", () => {
  it.each(["surface", "surface-muted", "background", "sage"] as const)("keeps control boundaries distinguishable on %s", (background) => {
    const values = [luminance(theme.colors["control-line"]), luminance(theme.colors[background])].sort((a, b) => a - b);
    expect((values[1] + 0.05) / (values[0] + 0.05)).toBeGreaterThanOrEqual(3);
  });
});
