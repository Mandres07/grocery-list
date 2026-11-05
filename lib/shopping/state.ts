export type ShoppingStatus = "pending" | "purchased" | "received";
export const SHOPPING_LABELS: Record<ShoppingStatus, string> = { pending: "Pendientes", purchased: "Comprados", received: "Recibidos" };
export interface ShoppingSnapshot { id: string; status: ShoppingStatus; revision: number; quantity: number }

export function latestShopping(current: ShoppingSnapshot, incoming: ShoppingSnapshot) {
  return incoming.revision >= current.revision ? incoming : current;
}

export interface ReceiptItem { id: string; revision: number; quantity: number }
