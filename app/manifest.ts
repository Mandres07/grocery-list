import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/brand";
import theme from "@/styles/theme.json";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: theme.colors.background,
    theme_color: theme.colors.brand,
    icons: [192, 512].map((size) => ({
      src: `/icons/basket-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
  };
}
