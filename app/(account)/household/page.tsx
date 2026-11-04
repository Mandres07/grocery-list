import { SectionPanel } from "@/components/ui/section-panel";
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
      <h1 className="heading-title mt-2">Tu cuenta está lista</h1>
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
  const isOwner = household?.ownerId.toString() === user.id;
  return <>
    <div className="section-header">
      <div><h1 className="heading-title">Mi hogar</h1><p className="mt-1 text-sm text-muted">Hola, {user.name}. Este es tu espacio compartido.</p></div>
      {household && <Link href="/inventory" className="action-primary">Abrir inventario</Link>}
    </div>
    <div className="panel-grid measure-settings mt-5">
      {household ? <>
        <SectionPanel title={household.name} description="Un hogar para organizarse juntos." icon="home">
          <dl><div className="data-pair"><dt>Tu rol</dt><dd>{isOwner ? "Propietario" : "Miembro"}</dd></div><div className="data-pair"><dt>Tu nombre</dt><dd>{user.name}</dd></div></dl>
          <p className="mt-3 text-sm text-muted">Los productos y cambios de existencias se comparten con las personas de este hogar.</p>
        </SectionPanel>
        <SectionPanel title="Compartir en familia" description={isOwner ? "Invita a otras personas y gestiona quién forma parte de tu hogar." : "Ya formas parte de este hogar. La persona propietaria gestiona las invitaciones y los miembros."} icon="users">
          {isOwner ? <Link href="/family" className="action-secondary">Gestionar mi familia</Link> : <Link href="/inventory" className="action-secondary">Ver productos compartidos</Link>}
        </SectionPanel>
      </> : <>
        <SectionPanel title="Tu hogar empieza aquí" description="Dale un nombre para empezar a organizar tus productos." icon="home">
          <AccountForm action={createHouseholdAction} embedded submitLabel="Crear mi hogar" fields={[{ name: "name", label: "Nombre del hogar", autoComplete: "off" }]} />
        </SectionPanel>
        <SectionPanel title="¿Te vas a unir a otro hogar?" description="No necesitas crear uno nuevo." icon="users">
          <p className="text-sm leading-6 text-muted">Abre el enlace de invitación que recibiste por correo. Puedes esperar una invitación sin crear un hogar.</p>
        </SectionPanel>
      </>}
    </div>
  </>;
}
