import { STOCK_LABELS, type StockStatus } from "@/lib/inventory/stock-status";

export function StockBadge({ status }: { status: StockStatus }) {
  return <span className={`status-label shrink-0 self-start whitespace-nowrap md:self-center ${status === "out" ? "bg-accent-soft text-accent" : status === "archived" ? "bg-sage text-muted" : status === "available" ? "bg-sage text-brand" : ""}`}>{STOCK_LABELS[status]}</span>;
}
