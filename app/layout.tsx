import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GroceryList · Tu hogar, en orden",
  description: "Un espacio para organizar los productos de tu hogar y compartir las compras en familia.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
