import { logAppError } from "@/lib/error-logging";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { unstable_rethrow } from "next/navigation";
import "./globals.css";
import { AppFooter } from "@/components/ui/app-footer";
import { AppHeader } from "@/components/ui/app-header";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";

const manrope = localFont({
  src: "./fonts/Manrope-Variable.ttf",
  variable: "--font-manrope",
  weight: "200 800",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} · Tu hogar, en orden`,
  description: "Un espacio para organizar los productos de tu hogar y compartir las compras en familia.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser().catch((error: unknown) => {
    unstable_rethrow(error);
    // Page authorization still fails closed; keep its error UI renderable.
    logAppError("header.account", error);
    return null;
  });
  return (
    <html lang="es" className={manrope.variable}>
      <body className="antialiased viewport-column"><AppHeader user={user} /><div className="flex-1">{children}</div><AppFooter /></body>
    </html>
  );
}
