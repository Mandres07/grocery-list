import { unexpiredHistory } from "@/lib/retention";
import { RecordRow } from "@/components/ui/record-row";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountForm } from "@/components/auth/account-form";
import { requireVerifiedUser } from "@/lib/auth/session";
import { requireHouseholdAccess } from "@/lib/households/access";
import Household from "@/models/Household";
import Membership from "@/models/Membership";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { inviteMemberAction, removeMemberAction, resendInvitationAction, revokeInvitationAction } from "./actions";

const statusLabels = { pending: "Pendiente", expired: "Vencida", accepted: "Aceptada", revoked: "Revocada" };

export default async function FamilyPage() {
  const user = await requireVerifiedUser();
  const membership = await Membership.findOne({ userId: user.id }).lean();
  if (!membership) redirect("/household");
  const access = await requireHouseholdAccess(user.id, membership.householdId.toString());
  if (access.role !== "owner") return <>
    <h1 className="heading-title">La gestión de la familia es privada</h1>
    <p className="notice mt-5">Solo la persona propietaria del hogar puede invitar y retirar personas.</p>
    <Link href="/household" className="action-secondary mt-6">Volver a mi hogar</Link>
  </>;
  const householdId = membership.householdId.toString();
  const household = await Household.findById(householdId).lean();
  const memberships = await Membership.find({ householdId }).lean();
  const members = await User.find({ _id: { $in: memberships.map((item) => item.userId) } }).select("name email").sort({ name: 1 }).lean();
  const invitations = await Invitation.find({ householdId, ...unexpiredHistory("expiresAt") }).sort({ createdAt: -1 }).limit(50).lean();
  return <>
    <Link href="/household" className="action-secondary mb-6">Volver a mi hogar</Link>
    <h1 className="heading-title">Tu familia</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Invita a tu familia a {household?.name}. Solo tú, como persona propietaria, puedes gestionar el acceso.</p>
    <section aria-labelledby="invite-title" className="section-separated max-w-lg">
      <h2 id="invite-title" className="text-lg font-semibold">Invitar a alguien</h2>
      <AccountForm action={inviteMemberAction} repeatable submitLabel="Enviar invitación" hiddenFields={{ householdId }} fields={[{ name: "email", label: "Correo electrónico", type: "email", autoComplete: "off" }]} />
    </section>
    <section aria-labelledby="members-title" className="section-separated">
      <h2 id="members-title" className="text-lg font-semibold">Personas del hogar</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Retirar a una persona le quita el acceso al hogar. Los productos y el historial compartido se conservan.</p>
      <ul className="record-list mt-2">{members.map((member) => <li key={member._id.toString()}>
        <RecordRow title={<>{member.name} {member._id.toString() === user.id && <span className="font-normal text-muted">· Propietario/a</span>}</>} description={member.email}>
          {member._id.toString() !== user.id && <AccountForm action={removeMemberAction} submitLabel={`Retirar a ${member.name}`} hiddenFields={{ householdId, memberId: member._id.toString() }} />}
        </RecordRow>
      </li>)}</ul>
    </section>
    <section aria-labelledby="invitations-title" className="section-separated">
      <h2 id="invitations-title" className="text-lg font-semibold">Invitaciones recientes</h2>
      {invitations.length === 0 ? <p className="notice mt-4">Todavía no has enviado invitaciones.</p> : <ul className="record-list mt-2">{invitations.map((invitation) => {
        const status = invitation.status === "pending" && invitation.expiresAt <= new Date() ? "expired" : invitation.status;
        const hiddenFields = { householdId, invitationId: invitation._id.toString(), email: invitation.email };
        return <li key={invitation._id.toString()} className="py-3">
          <p className="break-all font-semibold">{invitation.email}</p>
          <p className="mt-2 text-sm text-muted">{statusLabels[status]}{(status === "pending" || status === "expired") && <> · Vence: {invitation.expiresAt.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Panama" })}</>}</p>
          {(status === "pending" || status === "expired") && <div className="grid gap-4 sm:grid-cols-2">
            <AccountForm action={resendInvitationAction} submitLabel="Reenviar invitación" hiddenFields={hiddenFields} />
            <AccountForm action={revokeInvitationAction} submitLabel="Revocar invitación" hiddenFields={hiddenFields} />
          </div>}
        </li>;
      })}</ul>}
      <p className="mt-4 text-xs leading-5 text-muted">Se muestran hasta 50 invitaciones. Puedes reenviar después de un minuto. Un nuevo envío invalida el enlace anterior.</p>
    </section>
  </>;
}
