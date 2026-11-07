import Link from "next/link";
import { INVENTORY_PAGE_SIZE } from "@/lib/inventory/limits";

export function InventoryPagination({ page, pageCount, total, filters }: {
  page: number; pageCount: number; total: number; filters: Record<string, string>;
}) {
  if (pageCount <= 1) return null;
  const href = (value: number) => {
    const params = new URLSearchParams(filters);
    if (value > 1) params.set("page", String(value));
    return `/inventory${params.size ? `?${params}` : ""}`;
  };
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index);
  return <nav aria-label="Páginas del inventario" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-center text-xs text-muted tabular-nums sm:text-left">{(page - 1) * INVENTORY_PAGE_SIZE + 1}–{Math.min(page * INVENTORY_PAGE_SIZE, total)} de {total} productos</p>
    <div className="flex items-center justify-between gap-2 sm:justify-end">
      {page > 1 ? <Link href={href(page - 1)} prefetch={false} className="action-secondary" aria-label="Página anterior">Anterior</Link> : <button type="button" disabled className="action-secondary">Anterior</button>}
      <span className="text-sm tabular-nums sm:hidden" aria-current="page">{page} / {pageCount}</span>
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((value) => <Link key={value} href={href(value)} prefetch={false} aria-label={`Página ${value}`} aria-current={value === page ? "page" : undefined} className={value === page ? "action-primary" : "action-quiet"}>{value}</Link>)}
      </div>
      {page < pageCount ? <Link href={href(page + 1)} prefetch={false} className="action-secondary" aria-label="Página siguiente">Siguiente</Link> : <button type="button" disabled className="action-secondary">Siguiente</button>}
    </div>
  </nav>;
}
