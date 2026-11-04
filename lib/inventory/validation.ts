import { AccountError } from "@/lib/auth/validation";
import { requireObjectId } from "@/lib/households/access";

export function inventoryName(value: unknown, maxLength = 160) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) throw new AccountError(`Escribe un nombre de 1 a ${maxLength} caracteres.`);
  return value.trim();
}

export function wholeNumber(value: unknown) {
  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string" || !/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw new AccountError("Usa una cantidad entera, no negativa y dentro del límite permitido.");
  }
  return Number(text);
}

export function optionalQuantity(value: unknown) { return value === "" || value === null ? null : wholeNumber(value); }
export function optionalId(value: unknown) {
  if (value === "" || value === null) return null;
  if (typeof value !== "string") throw new AccountError("Selecciona una categoría válida.");
  return requireObjectId(value);
}

export function inventoryRequestId(value: string) {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(value)) throw new AccountError("La solicitud no es válida. Actualiza la página e intenta de nuevo.");
  return value;
}
