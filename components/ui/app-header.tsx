import Link from "next/link";
import { Brand } from "./brand";
import { DisclosureMenu } from "./disclosure-menu";
import { SignOutButton } from "@/components/auth/sign-in-form";

function AccountLinks({ emailVerified, className }: { emailVerified: boolean; className: string }) {
  return <>
    <Link href="/household" className={className}>Mi hogar</Link>
    {emailVerified && <Link href="/inventory" className={className}>Inventario</Link>}
    <Link href="/account" className={className}>Mi cuenta</Link>
  </>;
}

export function AppHeader({ user }: { user: { name: string; emailVerified: boolean } | null }) {
  return <header className="navigation-bar surface-inverse">
    <div className="navigation-content">
      <Brand />
      {user ? <>
        <nav aria-label="Mi cuenta" className="hidden items-center gap-1 lg:flex">
          <AccountLinks emailVerified={user.emailVerified} className="action-quiet action-inverse" />
          <SignOutButton className="action-quiet action-inverse" />
        </nav>
        <div className="lg:hidden">
          <DisclosureMenu label="Menú de cuenta">
            <nav aria-label="Mi cuenta" className="popover">
              <p className="mb-2 break-words text-sm font-semibold">{user.name}</p>
              <AccountLinks emailVerified={user.emailVerified} className="navigation-link" />
              <div className="mt-3 border-t border-line pt-3"><SignOutButton /></div>
            </nav>
          </DisclosureMenu>
        </div>
      </> : <Link href="/sign-in" className="action-quiet action-inverse">Iniciar sesión</Link>}
    </div>
  </header>;
}
