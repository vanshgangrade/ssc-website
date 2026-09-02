import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { isAdminEmail } from "@/lib/admin";

const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "").trim().toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db),
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      if (!allowedDomain) return true;
      return user.email.toLowerCase().endsWith(`@${allowedDomain}`);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.isAdmin = isAdminEmail(user.email);
      }
      return session;
    },
  },
});
