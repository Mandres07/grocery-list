export type StockStatus = "out" | "low" | "available" | "archived";

export function stockStatus(quantity: number, threshold: number | null, archived = false): StockStatus {
  if (archived) return "archived";
  if (quantity === 0) return "out";
  return threshold != null && quantity <= threshold ? "low" : "available";
}

export const STOCK_LABELS: Record<StockStatus, string> = {
  out: "Sin existencias", low: "Por reponer", available: "Disponible", archived: "Archivado",
};

interface PrioritizedProduct { id: string; name: string; quantity: number; lowStockThreshold: number | null; archived: boolean }
const priority: Record<StockStatus, number> = { out: 0, low: 1, available: 2, archived: 3 };

export function compareStockProducts(a: PrioritizedProduct, b: PrioritizedProduct) {
  const urgency = priority[stockStatus(a.quantity, a.lowStockThreshold, a.archived)] - priority[stockStatus(b.quantity, b.lowStockThreshold, b.archived)];
  if (urgency) return urgency;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
}
