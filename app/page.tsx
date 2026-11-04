import Link from "next/link";
import { InventoryPreview } from "@/components/inventory/inventory-preview";
import { Icon } from "@/components/ui/icon";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <a href="#main" className="sr-only rounded-lg bg-surface p-3 focus:not-sr-only focus:absolute focus:top-4 focus:left-4">Saltar al contenido</a>
      <header className="flex items-center justify-between gap-4 border-b border-line py-6 sm:py-8">
        <Link href="/" aria-label="GroceryList, inicio" className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-brand text-white"><Icon name="basket" className="size-6" /></span><span className="text-lg font-bold tracking-tight">GroceryList<span className="text-brand">.</span></span></Link>
        <span className="text-right text-xs leading-5 text-muted">Menos pendientes.<br className="sm:hidden" /> Más hogar.</span>
      </header>
      <main id="main" className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
        <section aria-labelledby="welcome-title">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-sage px-3 py-2 text-xs font-semibold text-brand"><Icon name="leaf" className="size-4" /> Un poquito de orden, todos los días</span>
          <h1 id="welcome-title" className="max-w-lg font-display text-5xl leading-[1.08] tracking-tight sm:text-6xl">Tu hogar,<br />en <span className="text-brand italic">orden.</span></h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-muted">Para saber qué hay, qué falta y qué comprar. Un espacio sencillo para cuidar de casa, juntos.</p>
          <a href="#preview" className="mt-7 inline-flex min-h-12 items-center justify-center gap-5 rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-hover">Explorar el ejemplo <Icon name="arrow" className="size-4" /></a>
          <ul className="mt-10 space-y-4 text-sm">
            <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-brand" /> Tu despensa y los esenciales del hogar</li>
            <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-brand" /> Cantidades claras, sin complicaciones</li>
            <li className="flex items-center gap-3"><Icon name="check" className="size-4 shrink-0 text-brand" /> Pensado para compartir en familia</li>
          </ul>
          <p className="mt-8 max-w-sm text-xs leading-5 text-muted">Primera vista del diseño. Las cuentas, las invitaciones y el inventario compartido llegarán en los próximos pasos.</p>
        </section>
        <InventoryPreview />
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-xs text-muted"><span>Un hogar. Un equipo.</span><span>Hecho para lo cotidiano.</span></footer>
    </div>
  );
}
