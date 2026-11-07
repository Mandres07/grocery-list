import { MAX_PRODUCT_BATCH_SIZE } from "./limits";

export function bulkProductMessage(added: number, omitted: number) {
  return `${added === 1 ? "Se agregó 1 producto" : `Se agregaron ${added} productos`}. ${omitted === 1 ? "Se omitió 1 producto duplicado" : `Se omitieron ${omitted} productos duplicados`}.`;
}

export function parseBulkResult(added: unknown, omitted: unknown) {
  if (typeof added !== "string" || typeof omitted !== "string" || !/^\d+$/.test(added) || !/^\d+$/.test(omitted)) return null;
  const counts = { added: Number(added), omitted: Number(omitted) };
  if (counts.added + counts.omitted < 1 || counts.added + counts.omitted > MAX_PRODUCT_BATCH_SIZE) return null;
  return counts;
}
