import type { Metadata } from "next";

// Email action tokens must not be sent in referrers when following other links.
export const metadata: Metadata = { referrer: "no-referrer" };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="content-shell">
      <main id="main" className="content-region">{children}</main>
    </div>
  );
}
