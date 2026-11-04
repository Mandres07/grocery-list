"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

type SampleProduct = { id: string; name: string; detail: string; icon: IconName; quantity: number; threshold: number };

const samples: SampleProduct[] = [
  { id: "rice", name: "Arroz", detail: "Despensa · bolsas de 1 kg", icon: "jar", quantity: 3, threshold: 1 },
  { id: "milk", name: "Leche", detail: "Refrigerados · cartones de 1 L", icon: "bottle", quantity: 1, threshold: 1 },
  { id: "soap", name: "Jabón de manos", detail: "Cuidado del hogar · botellas", icon: "leaf", quantity: 2, threshold: 1 },
];

export function InventoryPreview() {
  const [products, setProducts] = useState(samples);
  const [announcement, setAnnouncement] = useState("");

  function adjust(product: SampleProduct, delta: number) {
    const quantity = Math.max(0, Math.min(99, product.quantity + delta));
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, quantity } : item));
    setAnnouncement(`${product.name}: ${quantity} en casa.`);
  }

  const lowStock = products.filter((product) => product.quantity <= product.threshold).length;

  return (
    <section id="preview" aria-labelledby="inventory-title" className="scroll-mt-6 rounded-[2rem] border border-line bg-surface p-5 shadow-[0_20px_70px_-35px_#375e4645] sm:p-8">
      <div className="mb-7 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-muted uppercase"><Icon name="home" className="size-4" /> Mi hogar</span>
        <span className="rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-brand">Vista previa</span>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="inventory-title" className="font-display text-3xl tracking-tight">Lo que hay en casa</h2><p className="mt-2 text-sm text-muted">Un vistazo a tu día a día.</p></div>
        <Icon name="basket" className="size-9 text-brand" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-sage px-4 py-3"><p className="text-2xl font-semibold">{products.length}</p><p className="mt-1 text-xs text-muted">Productos de ejemplo</p></div>
        <div className="rounded-2xl bg-peach px-4 py-3"><p className="text-2xl font-semibold text-warning">{lowStock}</p><p className="mt-1 text-xs text-warning">Por reponer</p></div>
      </div>
      <ul className="divide-y divide-line">
        {products.map((product) => (
          <li key={product.id} className="flex flex-wrap items-center gap-x-3 gap-y-3 py-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background text-brand"><Icon name={product.icon} className="size-6" /></span>
            <div className="min-w-0 flex-1 basis-28"><h3 className="text-sm font-semibold">{product.name}</h3><p className="mt-1 text-xs leading-5 text-muted">{product.detail}</p>
              {product.quantity <= product.threshold && <p className="mt-1 text-xs font-semibold text-warning">{product.quantity === 0 ? "Sin existencias" : "Queda poco"}</p>}
            </div>
            <div className="ml-auto flex items-center rounded-full border border-line p-1">
              <button type="button" aria-label={`Restar una unidad de ${product.name}`} disabled={product.quantity === 0} onClick={() => adjust(product, -1)} className="flex size-11 items-center justify-center rounded-full text-xl hover:bg-sage disabled:cursor-not-allowed disabled:opacity-30">−</button>
              <span aria-label={`${product.quantity} en casa`} className="min-w-8 text-center text-lg font-semibold tabular-nums">{product.quantity}</span>
              <button type="button" aria-label={`Sumar una unidad de ${product.name}`} disabled={product.quantity === 99} onClick={() => adjust(product, 1)} className="flex size-11 items-center justify-center rounded-full bg-sage text-xl text-brand hover:bg-line disabled:cursor-not-allowed disabled:opacity-30">+</button>
            </div>
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">{announcement}</p>
      <div className="mt-3 border-t border-line pt-5">
        <p className="text-xs leading-5 text-muted">Prueba los botones + y −. Son datos de ejemplo: los cambios se reinician al recargar y todavía no se comparten.</p>
        <button type="button" onClick={() => { setProducts(samples); setAnnouncement("Ejemplo restablecido."); }} className="mt-2 min-h-11 text-xs font-semibold text-brand underline underline-offset-4 hover:text-brand-hover">Restablecer ejemplo</button>
      </div>
    </section>
  );
}
