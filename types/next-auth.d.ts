import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "customer" | "agent" | "admin";
      accountId: string | null;
      accountType: "individual" | "company" | null;
      membershipRole: "owner" | "member" | null;
    };
  }

  interface User {
    role: "customer" | "agent" | "admin";
    accountId: string | null;
    accountType: "individual" | "company" | null;
    membershipRole: "owner" | "member" | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "customer" | "agent" | "admin";
    accountId?: string | null;
    accountType?: "individual" | "company" | null;
    membershipRole?: "owner" | "member" | null;
  }
}
