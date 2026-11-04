import { AccountForm } from "@/components/auth/account-form";
import { requireSignedInUser } from "@/lib/auth/session";
import { VerificationNotice } from "@/components/auth/verification-notice";
import { requireHouseholdAccess } from "@/lib/households/access";
import Household from "@/models/Household";
import Membership from "@/models/Membership";
import { createHouseholdAction } from "../actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { pendingInvitationToken } from "@/lib/households/invitation-context";
import { getFamilyInvitation } from "@/lib/households/family";

export default async function HouseholdPage() {
  const user = await requireSignedInUser();
  if (!user.emailVerified) {
    const token = await pendingInvitationToken();
    const invitation = token ? await getFamilyInvitation(token) : null;
    return <>
      <p className="text-sm text-muted">Hola, {user.name}</p>
      <h1 className="page-title mt-2">Tu cuenta está lista</h1>
      {invitation?.status === "pending" && invitation.email === user.email && <p className="notice mt-5">Te espera una invitación a <strong>{invitation.householdName}</strong>. No necesitas crear otro hogar.</p>}
      <VerificationNotice email={user.email} />
    </>;
  }
  const membership = await Membership.findOne({ userId: user.id }).lean();
  if (!membership) {
    const token = await pendingInvitationToken();
    if (token) {
      const invitation = await getFamilyInvitation(token);
      if (invitation?.status === "pending" && invitation.email === user.email) redirect(`/invitation?token=${token}`);
    }
  }
  let household = null;
  if (membership) {
    await requireHouseholdAccess(user.id, membership.householdId.toString());
    household = await Household.findById(membership.householdId).lean();
  }
  return <>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-muted">Hola, {user.name}</p><h1 className="mt-2 font-display text-3xl sm:text-4xl">{household ? household.name : "Tu hogar empieza aquí"}</h1></div>
    </div>
    {household ? <>
      <p className="mt-6 rounded-2xl bg-sage p-4 text-sm leading-6">Tu hogar está guardado. {household.ownerId.toString() === user.id ? "Eres la persona propietaria de este hogar." : "Formas parte de este hogar."}</p>
      {household.ownerId.toString() === user.id && <Link href="/family" className="button-secondary mt-6">Gestionar mi familia</Link>}
      <Link href="/inventory" className="button-primary mt-6">Abrir mi inventario</Link>
      <p className="mt-5 text-sm leading-6 text-muted">Los productos y movimientos del inventario se guardan y comparten con las personas de este hogar. La lista de compras llegará en el siguiente paso.</p>
    </> : <>
      <p className="mt-5 text-sm leading-6 text-muted">Crea un hogar para organizarlo en familia. No hemos creado uno automáticamente al registrar tu cuenta.</p>
      <AccountForm action={createHouseholdAction} submitLabel="Crear mi hogar" fields={[{ name: "name", label: "Nombre del hogar", autoComplete: "off" }]} />
      <section aria-labelledby="invitation-title" className="mt-8 rounded-2xl bg-sage p-5"><h2 id="invitation-title" className="font-semibold">¿Te vas a unir al hogar de alguien más?</h2><p className="mt-2 text-sm leading-6 text-muted">Abre el enlace de invitación que recibiste por correo para unirte. Puedes esperar una invitación sin crear un hogar.</p></section>
    </>}
  </>;
}
