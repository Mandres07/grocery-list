import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "./config";

export async function getVerifiedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !/^[a-f\d]{24}$/i.test(session.user.id)) return null;
  await connectToDatabase();
  const user = await User.findById(session.user.id).select("+sessionVersion").lean();
  if (!user?.emailVerifiedAt || user.sessionVersion !== session.user.sessionVersion) return null;
  return { id: user._id.toString(), name: user.name, email: user.email, sessionVersion: user.sessionVersion };
}

export async function requireVerifiedUser() {
  const user = await getVerifiedUser();
  if (!user) redirect("/sign-in");
  return user;
}
