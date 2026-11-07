import { logAppError, type ErrorOperation } from "@/lib/error-logging";
import { AccountError } from "@/lib/auth/validation";
import { APP_NAME } from "@/lib/brand";
import { buildActionEmail, type EmailContent } from "./template";
import emailBrand from "@/styles/email-brand.generated.json";

export function applicationUrl() {
  const value = process.env.NEXTAUTH_URL?.trim() || (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : "");
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && (process.env.NODE_ENV === "production" || url.protocol !== "http:"))) {
    throw new Error("NEXTAUTH_URL must be an application origin, using HTTPS in production.");
  }
  return url;
}

export function emailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new AccountError("El envío de correos aún no está configurado. Intenta de nuevo más tarde.");
  if (process.env.NODE_ENV === "production" && /@resend\.dev\b/i.test(from)) {
    throw new Error("Use a verified sending domain in production.");
  }
  return { apiKey, from };
}

export async function sendAccountEmail(email: string, token: string, purpose: "verification" | "reset") {
  const url = new URL(purpose === "verification" ? "/verify-email" : "/reset-password", applicationUrl());
  url.searchParams.set("token", token);
  const subject = purpose === "verification" ? `Verifica tu correo en ${APP_NAME}` : `Restablece tu contraseña de ${APP_NAME}`;
  const expiry = purpose === "verification" ? "24 horas" : "1 hora";
  await sendTransactionalEmail(purpose === "verification" ? "email.verification" : "email.reset", email, buildActionEmail({
    subject, title: purpose === "verification" ? "Un paso más para entrar a casa" : "Recupera tu acceso",
    description: purpose === "verification" ? "Confirma tu correo para empezar a organizar tu hogar en familia." : "Recibimos una solicitud para cambiar tu contraseña. Elige una nueva para volver a tu hogar.",
    actionLabel: purpose === "verification" ? "Verificar mi correo" : "Cambiar mi contraseña", url: url.toString(),
    expiry: `Este enlace vence en ${expiry} y solo se puede usar una vez.`,
  }));
}

export async function sendInvitationEmail(email: string, token: string, householdName: string) {
  const url = new URL("/invitation", applicationUrl());
  url.searchParams.set("token", token);
  await sendTransactionalEmail("email.invitation", email, buildActionEmail({
    subject: `Te invitaron a un hogar en ${APP_NAME}`, title: "Un hogar para compartir",
    description: `Te invitaron a formar parte de «${householdName}». Usa este mismo correo para crear tu cuenta o iniciar sesión y aceptar la invitación.`,
    actionLabel: "Ver mi invitación", url: url.toString(), expiry: "Esta invitación vence en siete días y solo se puede aceptar una vez.",
  }));
}

async function sendTransactionalEmail(operation: ErrorOperation, email: string, content: EmailContent) {
  const { apiKey, from } = emailConfiguration();
  let status: number | undefined;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [email], ...content,
        attachments: [{ filename: "canasta.png", content: emailBrand.base64, content_id: "brand-basket" }],
        ...(process.env.RESEND_REPLY_TO_EMAIL?.trim() ? { reply_to: process.env.RESEND_REPLY_TO_EMAIL.trim() } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    status = response.status;
    if (!response.ok) {
      throw new AccountError("No pudimos enviar el correo. Intenta solicitar otro enlace en unos minutos.");
    }
  } catch (error) {
    logAppError(operation, error, { status });
    throw error;
  }
}
