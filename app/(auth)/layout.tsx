import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { referrer: "no-referrer" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>
    <a href="#main" className="sr-only focus:not-sr-only">Saltar al contenido</a>
    <div className="content-shell">
      <main id="main" className="responsive-split">
        <section aria-labelledby="welcome-title" className="lead-copy">
          <span className="eyebrow"><Icon name="leaf" className="size-4" /> Un poquito de orden, todos los días</span>
          <h1 id="welcome-title" className="heading-display">Tu hogar,<br className="hidden lg:block" /> en <span className="text-brand italic">orden.</span></h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted lg:text-base">Para saber qué hay, qué falta y qué comprar. Un espacio sencillo para cuidar de casa, juntos.</p>
          <Link href="/#registration" className="action-primary mt-5 hidden lg:inline-flex">Crear mi cuenta <Icon name="arrow" className="size-4" /></Link>
        </section>
        {children}
        <ul className="supporting-list">
          <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-accent" /> Tu despensa y los esenciales del hogar</li>
          <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-accent" /> Cantidades claras, sin complicaciones</li>
          <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-accent" /> Pensado para compartir en familia</li>
        </ul>
      </main>
    </div>
  </>;
}
