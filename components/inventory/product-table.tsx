"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { listInventory } from "@/lib/inventory/queries";
import { latestStock, type StockSnapshot } from "@/lib/inventory/stock-state";
import { stockStatus, compareStockProducts } from "@/lib/inventory/stock-status";
import { StockBadge } from "./stock-badge";
import { StockControls } from "./stock-controls";

const REORDER_IDLE_MS = 1500;

type InventoryProduct = Awaited<ReturnType<typeof listInventory>>["products"][number];

export function ProductTable({ householdId, products, categories, total = products.length, lowStockOnly = false, archived = false }: { householdId: string; products: InventoryProduct[]; categories: ReadonlyMap<string, string>; total?: number; lowStockOnly?: boolean; archived?: boolean }) {
  const router = useRouter();
  const [heldProducts, setHeldProducts] = useState<InventoryProduct[] | null>(null);
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAdjustments = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (reorderTimer.current) clearTimeout(reorderTimer.current); };
  }, []);
  const [confirmedStock, setConfirmedStock] = useState<Record<string, StockSnapshot>>({});
  const currentProducts = new Map(products.map((product) => [product.id, product]));
  const ranked = (heldProducts ?? products).map((held) => {
    const product = currentProducts.get(held.id) ?? held;
    const confirmed = confirmedStock[product.id];
    return confirmed ? { ...product, ...latestStock(product, confirmed) } : product;
  });
  if (!heldProducts) ranked.sort(compareStockProducts);
  const visible = lowStockOnly && !heldProducts ? ranked.filter((product) => {
    const status = stockStatus(product.quantity, product.lowStockThreshold, product.archived);
    return status === "out" || status === "low";
  }) : ranked;
  const visibleTotal = Math.max(0, total - (ranked.length - visible.length));
  function adjustingChanged(adjusting: boolean) {
    if (!mounted.current) return;
    if (reorderTimer.current) clearTimeout(reorderTimer.current);
    if (adjusting) {
      pendingAdjustments.current += 1;
      // Freeze membership as well as order so filtered rows stay available during editing.
      setHeldProducts((current) => current ?? visible);
    } else {
      pendingAdjustments.current -= 1;
      if (pendingAdjustments.current === 0) reorderTimer.current = setTimeout(() => {
        setHeldProducts(null);
        router.refresh();
      }, REORDER_IDLE_MS);
    }
  }
  function confirmStock(id: string, incoming: StockSnapshot) {
    setConfirmedStock((current) => ({ ...current, [id]: current[id] ? latestStock(current[id], incoming) : incoming }));
  }
  return <>
    <p className="mt-4 text-xs text-muted">{visibleTotal} {visibleTotal === 1 ? "producto encontrado" : "productos encontrados"}{!archived && visibleTotal > 0 && " · Por comprar primero"}</p>
    {visible.length === 0 ? <p className="notice mt-4">No hay productos en esta vista. Agrega el primero o cambia los filtros.</p> : <div className="collection-surface mt-2"><table className="table-responsive table-compact" role="table">
    <caption className="sr-only">Productos del inventario y existencias en casa</caption>
    <thead role="rowgroup"><tr role="row"><th scope="col">Producto</th><th scope="col">Categoría</th><th scope="col">Unidad</th><th scope="col">Existencias</th></tr></thead>
    <tbody role="rowgroup">{visible.map((product) => {
      const category = product.categoryId ? categories.get(product.categoryId) ?? "Sin categoría" : "Sin categoría";
      const status = stockStatus(product.quantity, product.lowStockThreshold, product.archived);
      return <tr key={product.id} role="row" data-stock-status={status}>
        <th scope="row" role="rowheader" className="cell-primary">
          <div className="flex items-center gap-2"><Link href={`/inventory/${product.id}`} className="record-link"><span className="record-identity"><span className="min-w-0 line-clamp-2" title={product.name}>{product.name}</span>{status !== "available" && <StockBadge status={status} />}</span><span className="text-xs font-normal text-muted line-clamp-1 md:hidden">{product.unit} · {category}</span></Link>

          </div>
          {product.archived && <p className="text-xs font-normal text-muted">Abre el producto para restaurarlo.</p>}
        </th>
        <td role="cell" className="cell-description"><span className="label-soft">{category}</span></td>
        <td role="cell" className="cell-description">{product.unit}</td>
        <td role="cell" className="cell-actions">{product.archived ? <span className="text-lg font-semibold tabular-nums" aria-label={`${product.quantity} en casa`}>{product.quantity}</span> : <StockControls householdId={householdId} productId={product.id} name={product.name} quantity={product.quantity} revision={product.revision} onStockChange={(stock) => confirmStock(product.id, stock)} onAdjustingChange={adjustingChanged} />}</td>
      </tr>;
    })}</tbody>
  </table></div>}
  </>;
}
