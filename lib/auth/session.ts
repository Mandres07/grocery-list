import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "./config";
import { cache } from "react";

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !/^[a-f\d]{24}$/i.test(session.user.id)) return null;
  await connectToDatabase();
  const user = await User.findById(session.user.id).select("+sessionVersion").lean();
  if (!user || user.sessionVersion !== session.user.sessionVersion) return null;
  return { id: user._id.toString(), name: user.name, email: user.email, sessionVersion: user.sessionVersion, emailVerified: Boolean(user.emailVerifiedAt) };
});

export async function getVerifiedUser() {
  const user = await getCurrentUser();
  return user?.emailVerified ? user : null;
}

export async function requireSignedInUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireVerifiedUser() {
  const user = await requireSignedInUser();
  if (!user.emailVerified) redirect("/household");
  return user;
}
