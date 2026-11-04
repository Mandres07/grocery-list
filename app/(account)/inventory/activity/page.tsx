import { inventoryPageContext } from "@/lib/inventory/page-context";
import { listInventoryActivity } from "@/lib/inventory/queries";
import { parseActivityFilters } from "@/lib/inventory/activity-filters";
import { InventoryShell } from "@/components/inventory/inventory-shell";
import { ActivityList } from "@/components/inventory/activity-list";
import { RefreshInventory } from "@/components/inventory/refresh-inventory";
import { ListFilters } from "@/components/ui/list-filters";
import { FormField } from "@/components/ui/form-field";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, householdId } = await inventoryPageContext();
  const params = await searchParams;
  const { filters, error } = parseActivityFilters({ query: params.q, person: params.person, from: params.from, to: params.to });
  const { query, person, from, to } = filters;
  const filtered = Boolean(query || person || from || to || error);
  const movements = error ? [] : await listInventoryActivity(user, householdId, undefined, filters);
  return <InventoryShell title="Actividad" description="Revisa los cambios de existencias y quién los hizo." active="/inventory/activity" action={<ListFilters action="/inventory/activity" label="Buscar por producto" placeholder="Nombre del producto" query={query} activeFilters={filtered} key={JSON.stringify(filters)}>
    <FormField label="Persona responsable" name="person" type="search" placeholder="Nombre de la persona" maxLength={160} defaultValue={person} />
    <div className="grid gap-3 sm:grid-cols-2"><FormField label="Desde" name="from" type="date" defaultValue={from} /><FormField label="Hasta" name="to" type="date" defaultValue={to} /></div>
    <p className="field-hint">Fechas inclusivas, en hora de Panamá. Puedes usar uno o ambos límites.</p>
  </ListFilters>}>
    {error ? <p role="alert" className="notice notice-warning mt-4">{error}</p> : <ActivityList householdId={householdId} movements={movements} filtered={filtered} expanded />}
    <RefreshInventory />
  </InventoryShell>;
}
