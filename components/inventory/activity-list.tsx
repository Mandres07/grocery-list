import { randomUUID } from "node:crypto";
import { ActionForm } from "@/components/ui/action-form";
import { inventoryAction } from "@/app/(account)/inventory/actions";
import type { listInventoryActivity } from "@/lib/inventory/queries";

const reasons = { receipt: "Entrada", consumption: "Consumo", correction: "Corrección", undo: "Deshacer" };

export function ActivityList({ householdId, movements }: { householdId: string; movements: Awaited<ReturnType<typeof listInventoryActivity>> }) {
  return <section aria-labelledby="activity-title" className="mt-10 border-t border-line pt-6">
    <h2 id="activity-title" className="section-heading">Actividad reciente</h2>
    {movements.length === 0 ? <p className="notice mt-4">Todavía no hay cambios de existencias. Los movimientos aparecerán aquí con la persona que los hizo.</p> : <ul className="mt-4 space-y-4">{movements.map((item) => <li key={item.id} className="inventory-card">
      <p className="font-semibold">{item.productName} · {item.delta > 0 ? "+" : ""}{item.delta}</p>
      <p className="mt-2 text-sm text-muted">{reasons[item.reason]} · {item.actorName}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{item.quantityBefore !== null && item.quantityBefore !== undefined && <>{item.quantityBefore} → {item.quantityAfter} · </>}{item.createdAt && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Panama" })}</time>}</p>
      {item.canUndo && <ActionForm action={inventoryAction} requestId={randomUUID()} submitLabel="Deshacer movimiento" hiddenFields={{ kind: "undo-stock", householdId, movementId: item.id }} />}
    </li>)}</ul>}
    <p className="mt-3 text-xs leading-5 text-muted">Se muestran los últimos 50 movimientos. Deshacer aplica un movimiento contrario sobre las existencias actuales; conserva los cambios posteriores.</p>
  </section>;
}
