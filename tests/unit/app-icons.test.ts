import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import theme from "@/styles/theme.json";
import manifest from "@/app/manifest";
import { APP_NAME } from "@/lib/brand";

describe("iPhone Home Screen icon", () => {
  it("provides an opaque 180px PNG using the favicon basket artwork", async () => {
    const icon = readFileSync(new URL("../../app/apple-icon.png", import.meta.url));
    const metadata = await sharp(icon).metadata();
    expect(metadata).toMatchObject({ format: "png", width: 180, height: 180, hasAlpha: false });

    const favicon = readFileSync(new URL("../../app/icon.svg", import.meta.url));
    const expected = await sharp(favicon).resize(180, 180)
      .flatten({ background: theme.colors.brand }).raw().toBuffer();
    expect(await sharp(icon).raw().toBuffer()).toEqual(expected);
  });
});

describe("Android Home Screen icons", () => {
  it("declares the app identity and launch URL", () => {
    expect(manifest()).toMatchObject({
      name: APP_NAME,
      lang: "es",
      start_url: "/",
      display: "standalone",
      theme_color: theme.colors.brand,
    });
  });

  it("serves both manifest sizes with the same basket artwork", async () => {
    const icons = manifest().icons!;
    expect(icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    const favicon = readFileSync(new URL("../../app/icon.svg", import.meta.url));
    for (const icon of icons) {
      const file = readFileSync(new URL(`../../public${icon.src}`, import.meta.url));
      const size = parseInt(icon.sizes!);
      expect(icon.type).toBe("image/png");
      expect(await sharp(file).metadata()).toMatchObject({
        format: "png", width: size, height: size, hasAlpha: false,
      });
      const expected = await sharp(favicon).resize(size, size)
        .flatten({ background: theme.colors.brand }).raw().toBuffer();
      expect(await sharp(file).raw().toBuffer()).toEqual(expected);
    }
  });
});
