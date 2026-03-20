import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import {
  findUserByEmail,
  getPrimaryAccountContextForUser,
} from "@/lib/auth/user-repo";
import { verifyPassword } from "@/lib/auth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await findUserByEmail(email);
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        const ctx = await getPrimaryAccountContextForUser(user.id);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          accountId: ctx?.accountId ?? null,
          accountType: ctx?.accountType ?? null,
          membershipRole: ctx?.membershipRole ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role;
        token.accountId = (user as any).accountId;
        token.accountType = (user as any).accountType;
        token.membershipRole = (user as any).membershipRole;
      }

      if (
        token.uid &&
        token.role === "customer" &&
        (trigger === "update" ||
          !token.accountId ||
          !token.accountType ||
          !token.membershipRole)
      ) {
        const ctx = await getPrimaryAccountContextForUser(String(token.uid));
        token.accountId = ctx?.accountId ?? null;
        token.accountType = ctx?.accountType ?? null;
        token.membershipRole = ctx?.membershipRole ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid as string;
        (session.user as any).role = token.role as string;
        (session.user as any).accountId = token.accountId as string | null;
        (session.user as any).accountType = token.accountType as string | null;
        (session.user as any).membershipRole = token.membershipRole as
          | string
          | null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
