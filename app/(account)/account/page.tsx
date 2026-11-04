import Link from "next/link";
import { requireSignedInUser } from "@/lib/auth/session";
import { AccountForm } from "@/components/auth/account-form";
import { VerificationNotice } from "@/components/auth/verification-notice";
import { SectionPanel } from "@/components/ui/section-panel";
import { updateNameAction } from "../actions";

export default async function AccountPage() {
  const user = await requireSignedInUser();
  return <>
    <h1 className="heading-title">Mi cuenta</h1>
    <p className="mt-1 text-sm text-muted">Tus datos personales y la seguridad de tu cuenta.</p>
    {!user.emailVerified && <VerificationNotice email={user.email} />}
    <div className="panel-grid measure-settings mt-5">
      <SectionPanel title="Datos personales" description="Así te verán las personas de tu hogar." icon="user">
        <AccountForm action={updateNameAction} embedded repeatable submitLabel="Guardar nombre" fields={[{ name: "name", label: "Tu nombre", autoComplete: "name", defaultValue: user.name }]} />
      </SectionPanel>
      <div className="stack">
        <SectionPanel title="Correo de la cuenta" icon="check">
          <p className="break-all text-sm font-semibold">{user.email}</p>
          <p className={`mt-2 inline-flex items-center gap-2 text-xs ${user.emailVerified ? "text-brand" : "text-warning"}`}><span className={`indicator-dot ${user.emailVerified ? "bg-brand" : "bg-warning"}`} />{user.emailVerified ? "Correo verificado" : "Pendiente de verificación"}</p>
        </SectionPanel>
        <SectionPanel title="Seguridad" description="Cambia tu contraseña mediante un enlace enviado a tu correo." icon="lock">
          <Link href="/forgot-password" className="action-secondary">Cambiar contraseña</Link>
        </SectionPanel>
      </div>
    </div>
  </>;
}
