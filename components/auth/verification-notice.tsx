import { AccountForm } from "./account-form";
import { resendVerificationAction } from "@/app/(account)/actions";

export function VerificationNotice({ email }: { email: string }) {
  return <section aria-labelledby="verification-title" className="notice notice-warning mt-6">
    <h2 id="verification-title" className="heading-section">Ya estás dentro. Confirma tu correo para continuar</h2>
    <p className="mt-2 break-words">Revisa <strong>{email}</strong> y confirma tu cuenta con el enlace de verificación. Si no lo recibiste, solicita otro aquí. Verifica tu correo para crear o unirte a un hogar y gestionar productos.</p>
    <AccountForm action={resendVerificationAction} repeatable submitLabel="Enviar otro enlace" hiddenFields={{ email }} />
    <a href="/household" className="mt-3 inline-flex min-h-12 items-center underline underline-offset-4">Ya confirmé mi correo</a>
  </section>;
}
