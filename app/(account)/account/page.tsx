import Link from "next/link";
import { requireSignedInUser } from "@/lib/auth/session";
import { AccountForm } from "@/components/auth/account-form";
import { VerificationNotice } from "@/components/auth/verification-notice";
import { updateNameAction } from "../actions";

export default async function AccountPage() {
  const user = await requireSignedInUser();
  return <>
    <h1 className="heading-title">Mi cuenta</h1>
    <dl className="detail-grid mt-4"><div><dt className="font-semibold">Nombre</dt><dd>{user.name}</dd></div><div><dt className="font-semibold">Correo</dt><dd className="break-all">{user.email}</dd></div><div><dt className="font-semibold">Estado</dt><dd>{user.emailVerified ? "Correo verificado" : "Pendiente de verificación"}</dd></div></dl>
    {!user.emailVerified && <VerificationNotice email={user.email} />}
    <section className="section-separated max-w-lg"><h2 className="heading-section">Cambiar mi nombre</h2><AccountForm action={updateNameAction} repeatable submitLabel="Guardar nombre" fields={[{ name: "name", label: "Tu nombre", autoComplete: "name" }]} /></section>
    <Link href="/forgot-password" className="action-secondary mt-4">Cambiar o recuperar mi contraseña</Link>
  </>;
}
