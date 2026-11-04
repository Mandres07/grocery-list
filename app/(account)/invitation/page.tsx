import Link from "next/link";
import { AccountForm } from "@/components/auth/account-form";
import { SignOutButton } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getFamilyInvitation } from "@/lib/households/family";
import { validToken } from "@/lib/auth/validation";
import { acceptInvitationAction, continueInvitationAction } from "../family/actions";

export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const invitation = await getFamilyInvitation(token);
  if (!invitation || invitation.status !== "pending" || !validToken(token)) return <>
    <h1 className="page-title">Invitación no disponible</h1>
    <p className="notice mt-5">El enlace puede haber vencido, sido revocado o aceptado. Pide uno nuevo a la persona propietaria del hogar.</p>
    <Link href="/household" className="button-secondary mt-6">Ir a mi hogar</Link>
  </>;
  const user = await getCurrentUser();
  return <>
    <h1 className="page-title">Te invitaron a compartir hogar</h1>
    <p className="mt-4 text-sm leading-6 text-muted">Únete a <strong>{invitation.householdName}</strong> para organizar el hogar en familia. La invitación vence en siete días desde su envío.</p>
    {user && !user.emailVerified ? <>
      <p className="notice mt-5">Ya iniciaste sesión. Conservaremos esta invitación mientras verificas tu correo.</p>
      <form action={continueInvitationAction} className="mt-6"><input type="hidden" name="token" value={token} /><input type="hidden" name="destination" value="sign-in" /><button className="button-primary">Continuar y verificar mi correo</button></form>
    </> : user ? user.email === invitation.email ? <>
      <p className="notice mt-5">Aceptarás la invitación con {user.email}.</p>
      <AccountForm action={acceptInvitationAction} token={token} submitLabel="Aceptar invitación" />
    </> : <>
      <p className="notice mt-5">Esta invitación es para otro correo. Cierra sesión y entra con el correo que recibió la invitación.</p>
      <div className="mt-5"><SignOutButton /></div>
    </> : <>
      <p className="notice mt-5">Crea tu cuenta o inicia sesión con el mismo correo que recibió esta invitación. Verifica tu correo antes de aceptarla. No necesitas crear otro hogar.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">{["register", "sign-in"].map((destination) => <form key={destination} action={continueInvitationAction}>
        <input type="hidden" name="token" value={token} /><input type="hidden" name="destination" value={destination} />
        <button className="button-primary">{destination === "register" ? "Crear mi cuenta" : "Ya tengo una cuenta"}</button>
      </form>)}</div>
    </>}
  </>;
}
