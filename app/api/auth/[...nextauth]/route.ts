import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import {
  findUserByEmail,
  getPrimaryAccountContextForUser,
} from "@/lib/auth/user-repo";
import { verifyPassword } from "@/lib/auth/password";
import { validateMagicLinkCompound } from "@/lib/magic-link-validate";
import { getGuestUser } from "@/lib/auth/guest-user-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Guest sessions are capped at 48 hours from first sign-in. The NextAuth
// cookie itself may live longer (default 30 days), but requests where the
// decoded JWT's `guestSessionExpiresAt` has passed are treated as
// unauthenticated by both middleware and requireAuthToken.
const GUEST_SESSION_TTL_MS = 48 * 60 * 60 * 1000;

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
          isGuest: false,
          sessionExpiresAt: null,
        } as any;
      },
    }),
    CredentialsProvider({
      id: "guest-magic-link",
      name: "Guest Magic Link",
      credentials: {
        // The compound `<linkId>.<rawToken>` string from the URL. The
        // landing page passes this to `signIn("guest-magic-link", { ... })`
        // after a successful consume call.
        magicLinkToken: { label: "Magic link token", type: "text" },
      },
      async authorize(credentials) {
        const compound = credentials?.magicLinkToken;
        if (!compound || typeof compound !== "string") return null;

        // Re-run the same validation the consume route did. Prevents a
        // link that was revoked between consume and signIn from still
        // minting a session.
        const result = await validateMagicLinkCompound(compound);
        if (!result.ok) return null;

        const guest = await getGuestUser(result.row.guestUserId);
        if (!guest) return null;

        return {
          id: guest.id,
          email: guest.email,
          role: "customer",
          accountId: guest.accountId,
          accountType: "individual" as const,
          membershipRole: "owner" as const,
          isGuest: true,
          sessionExpiresAt: new Date(
            Date.now() + GUEST_SESSION_TTL_MS,
          ).toISOString(),
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
        token.isGuest = Boolean((user as any).isGuest);
        token.sessionExpiresAt = (user as any).sessionExpiresAt ?? null;
      }

      // Guest session expiry enforcement. Once the 48-hour window elapses
      // we wipe identity fields — subsequent getToken() calls see no uid
      // and middleware/requireAuthToken treat the request as anonymous.
      // The cookie still lives in the browser, but it's now an empty
      // payload and will get replaced on the next request.
      if (token.isGuest && token.sessionExpiresAt) {
        const exp = new Date(String(token.sessionExpiresAt)).getTime();
        if (!Number.isFinite(exp) || exp < Date.now()) {
          return {} as any;
        }
      }

      if (
        token.uid &&
        token.role === "customer" &&
        !token.isGuest &&
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
        (session.user as any).isGuest = Boolean(token.isGuest);
        (session.user as any).sessionExpiresAt =
          (token.sessionExpiresAt as string | null) ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
