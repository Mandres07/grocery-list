import { emailPattern } from "@/models/shared";

export class AccountError extends Error {}

export function emailAddress(value: unknown): string {
  if (typeof value !== "string") throw new AccountError("Escribe un correo válido.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) throw new AccountError("Escribe un correo válido.");
  return email;
}

export function accountPassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128 || !value.trim()) {
    throw new AccountError("Usa una contraseña de 12 a 128 caracteres.");
  }
  return value;
}

export function displayName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
    throw new AccountError("Escribe un nombre de 1 a 100 caracteres.");
  }
  return value.trim();
}

export function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
