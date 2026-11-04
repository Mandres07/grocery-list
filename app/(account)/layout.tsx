import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/components/ui/brand";

// Email action tokens must not be sent in referrers when following other links.
export const metadata: Metadata = { referrer: "no-referrer" };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Brand />
        <Link href="/#preview" className="inline-flex min-h-12 items-center text-sm text-muted underline underline-offset-4">Ver el ejemplo</Link>
      </header>
      <main id="main" className="rounded-3xl border border-line bg-surface p-6 sm:p-10">{children}</main>
      <footer className="py-8 text-center text-xs text-muted">Un hogar. Un equipo.</footer>
    </div>
  );
}
