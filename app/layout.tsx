import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import "./globals.css";
import { AppHeader } from "@/components/ui/app-header";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${APP_NAME} · Tu hogar, en orden`,
  description: "Un espacio para organizar los productos de tu hogar y compartir las compras en familia.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser().catch((error: unknown) => {
    unstable_rethrow(error);
    // Page authorization still fails closed; keep its error UI renderable.
    console.error("Header account lookup unavailable");
    return null;
  });
  return (
    <html lang="es">
      <body className="antialiased"><AppHeader user={user} />{children}</body>
    </html>
  );
}
