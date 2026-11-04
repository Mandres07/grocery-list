export interface StockSnapshot {
  quantity: number;
  revision: number;
}

// Action responses and refreshed pages may arrive in either order.
export function latestStock(current: StockSnapshot, incoming: StockSnapshot): StockSnapshot {
  return incoming.revision >= current.revision ? incoming : current;
}
