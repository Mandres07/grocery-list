import { logAppError } from "@/lib/error-logging";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateAccount } from "./accounts";
import { AccountError } from "./validation";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 3 * 24 * 60 * 60 },
  // Isolate cookies from Scorecast, including when both use localhost.
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-grocery.session-token" : "grocery.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" ? "__Host-grocery.csrf-token" : "grocery.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" ? "__Secure-grocery.callback-url" : "grocery.callback-url",
      options: { sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  providers: [CredentialsProvider({
    name: "Correo y contraseña",
    credentials: { email: { type: "email" }, password: { type: "password" } },
    async authorize(credentials) {
      if ((process.env.NEXTAUTH_SECRET?.length ?? 0) < 32) return null;
      try {
        return await authenticateAccount(credentials?.email, credentials?.password);
      } catch (error) {
        if (error instanceof AccountError) return null;
        logAppError("auth.sign-in", error);
        return null;
      }
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.sessionVersion = token.sessionVersion ?? -1;
      }
      return session;
    },
  },
};
