import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/app-header";
import { getCurrentUser } from "@/lib/auth/session";

// Email action tokens must not be sent in referrers when following other links.
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      <AppHeader user={user} />
      <main id="main" className="surface-panel">{children}</main>
      <footer className="py-8 text-center text-xs text-muted">Un hogar. Un equipo.</footer>
    </div>
  );
}
