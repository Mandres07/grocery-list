// Server-side diagnostics only. Never serialize an Error, request, or provider body.
export type ErrorOperation =
  | "inventory.submit" | "shopping.submit" | "shopping.search"
  | "account.register" | "account.verification-request" | "account.reset-request"
  | "account.verify" | "account.rename" | "account.reset-password" | "household.create"
  | "household.rename" | "family.invite" | "family.resend" | "family.revoke"
  | "family.remove-member" | "family.accept" | "family.email"
  | "auth.sign-in" | "header.account" | "registration.email"
  | "email.verification" | "email.reset" | "email.invitation" | "server.request";

const references = new WeakMap<object, string>();
const errorNames = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "AggregateError", "ValidationError", "ValidatorError", "CastError", "StrictModeError", "MongoServerError", "MongoBulkWriteError", "MongoNetworkError", "MongoServerSelectionError", "MongoNetworkTimeoutError", "MongooseError", "MongooseServerSelectionError", "AbortError", "TimeoutError"]);
const errorCodes = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "ABORT_ERR", "ERR_INVALID_URL", "ERR_FETCH_FAILED"]);
const fields = new Set(["name", "email", "passwordHash", "householdId", "productId", "categoryId", "parentId", "quantity", "unit", "revision", "lowStockThreshold", "archivedAt", "actorId", "delta", "reason", "requestId", "fingerprint", "resultId", "movementId", "undoOfMovementId", "quantityBefore", "quantityAfter", "status", "receivedQuantity", "receivedAt", "receivedMovementId", "receiptId", "retentionExpiresAt", "addedCount", "omittedCount", "ownerId", "userId", "expiresAt", "sentAt", "sessionVersion"]);
const actions = new Set(["create-products", "create-product", "edit-product", "archive-product", "restore-product", "adjust-stock", "correct-stock", "undo-stock", "save-category", "delete-category", "add", "low-stock", "purchase", "edit", "delete", "receive-batch", "receive"]);

function record(error: unknown): Record<string, unknown> | null {
  return error !== null && typeof error === "object" ? error as Record<string, unknown> : null;
}

export function logAppError(operation: ErrorOperation, error: unknown, context: { action?: unknown; status?: number; route?: string; routeType?: string } = {}) {
  const details = record(error);
  const errorId = (details && references.get(details)) || crypto.randomUUID();
  if (details) references.set(details, errorId);
  const code = details?.code ?? record(details?.cause)?.code;
  const validation = record(details?.errors);
  const validationFields = validation ? Object.keys(validation).filter(field => fields.has(field)).sort() : [];
  console.error(JSON.stringify({
    event: "application.error", level: "error", timestamp: new Date().toISOString(), operation, errorId,
    error: {
      name: typeof details?.name === "string" && errorNames.has(details.name) ? details.name : "Error",
      ...(typeof code === "number" && Number.isSafeInteger(code) || typeof code === "string" && errorCodes.has(code) ? { code } : {}),
      ...(typeof details?.path === "string" && fields.has(details.path) ? { path: details.path } : {}),
      ...(validationFields.length ? { fields: validationFields } : {}),
      ...(typeof details?.digest === "string" && /^\d{1,30}$/.test(details.digest) ? { digest: details.digest } : {}),
    },
    ...(typeof context.action === "string" && actions.has(context.action) ? { action: context.action } : {}),
    ...(typeof context.status === "number" && Number.isInteger(context.status) && context.status >= 100 && context.status <= 599 ? { status: context.status } : {}),
    // Only the framework's route-file pattern belongs here, never request.path.
    ...(context.route && /^\/[a-zA-Z0-9_()/.[\]-]{1,160}$/.test(context.route) ? { route: context.route } : {}),
    ...(context.routeType && ["render", "route", "action", "proxy"].includes(context.routeType) ? { routeType: context.routeType } : {}),
  }));
  return errorId;
}

export function withErrorReference(message: string, error: unknown, fallbackId?: string) {
  const details = record(error);
  const errorId = (details ? references.get(details) : undefined) ?? fallbackId;
  return errorId ? `${message} Referencia: ${errorId}.` : message;
}
