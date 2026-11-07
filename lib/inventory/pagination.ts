import { INVENTORY_PAGE_SIZE } from "./limits";

export function inventoryPage(value: unknown) {
  const page = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof page === "number" && Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function inventoryPagination(total: number, requestedPage: unknown) {
  const pageCount = Math.max(1, Math.ceil(total / INVENTORY_PAGE_SIZE));
  const page = Math.min(inventoryPage(requestedPage), pageCount);
  return { page, pageCount, offset: (page - 1) * INVENTORY_PAGE_SIZE };
}
