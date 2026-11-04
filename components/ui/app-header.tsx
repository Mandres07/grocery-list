import Link from "next/link";
import { Brand } from "./brand";
import { Icon } from "./icon";
import { SignOutButton } from "@/components/auth/sign-in-form";

export function AppHeader({ user }: { user: { name: string; emailVerified: boolean } | null }) {
  return <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
    <Brand />
    {user ? <details className="relative">
      <summary className="button-secondary cursor-pointer list-none gap-2" aria-label="Abrir menú de cuenta"><Icon name="menu" className="size-5" /><span>Menú</span></summary>
      <nav aria-label="Mi cuenta" className="absolute right-0 z-20 mt-3 w-64 max-w-[80vw] rounded-2xl border border-line bg-surface p-4 shadow-lg">
        <p className="mb-2 break-words text-sm font-semibold">{user.name}</p>
        <Link href="/household" className="menu-link">Mi hogar</Link>
        {user.emailVerified && <Link href="/inventory" className="menu-link">Inventario</Link>}
        <Link href="/account" className="menu-link">Mi cuenta</Link>
        <div className="mt-3 border-t border-line pt-3"><SignOutButton /></div>
      </nav>
    </details> : <Link href="/sign-in" className="button-secondary">Iniciar sesión</Link>}
  </header>;
}
