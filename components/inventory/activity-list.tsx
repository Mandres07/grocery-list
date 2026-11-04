import { randomUUID } from "node:crypto";
import { ActionForm } from "@/components/ui/action-form";
import { Icon } from "@/components/ui/icon";
import { inventoryAction } from "@/app/(account)/inventory/actions";
import type { listInventoryActivity } from "@/lib/inventory/queries";

const reasons = { receipt: "Entrada", consumption: "Consumo", correction: "Corrección", undo: "Deshacer" };

export function ActivityList({ householdId, movements, expanded = false, filtered = false }: { householdId: string; expanded?: boolean; filtered?: boolean; movements: Awaited<ReturnType<typeof listInventoryActivity>> }) {
  const content = <>
    {movements.length === 0 ? <p className="notice mt-4">{filtered ? "No hay movimientos que coincidan con estos filtros." : "Todavía no hay cambios de existencias. Los movimientos aparecerán aquí con la persona que los hizo."}</p> : <ul className="record-list collection-surface mt-4">{movements.map((item) => <li key={item.id} className="event-row">
      <span className={item.delta > 0 ? "symbol-muted text-brand" : "symbol-soft"}><Icon name={item.reason === "undo" ? "history" : item.delta > 0 ? "plus" : "arrow"} className="glyph-icon" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3"><p className="text-sm font-semibold break-words">{item.productName}</p><span className={`label-soft tabular-nums ${item.delta > 0 ? "text-brand" : "text-accent"}`}>{item.delta > 0 ? "+" : ""}{item.delta}</span></div>
        <p className="mt-1 text-xs text-muted">{reasons[item.reason]} · {item.actorName}{item.quantityBefore !== null && item.quantityBefore !== undefined && <> · {item.quantityBefore} → {item.quantityAfter}</>}</p>
        {item.createdAt && <time className="block text-xs leading-5 text-muted" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Panama" })}</time>}
      </div>
      {item.canUndo && <div className="event-action"><ActionForm action={inventoryAction} requestId={randomUUID()} submitIcon="history" submitLabel="Deshacer" submitAriaLabel={`Deshacer movimiento de ${item.productName}`} submitClassName="action-quiet action-icon text-muted hover:text-brand" hiddenFields={{ kind: "undo-stock", householdId, movementId: item.id }} /></div>}
    </li>)}</ul>}
    <p className="mt-3 text-xs leading-5 text-muted">{filtered ? "Se muestran los últimos 50 movimientos que coinciden con los filtros." : "Se muestran los últimos 50 movimientos."} Deshacer aplica un movimiento contrario sobre las existencias actuales; conserva los cambios posteriores.</p>
  </>;
  return expanded ? <section aria-label="Actividad reciente">{content}</section> : <details className="disclosure section-separated"><summary className="disclosure-trigger">Actividad reciente · {movements.length}</summary>{content}</details>;
}
