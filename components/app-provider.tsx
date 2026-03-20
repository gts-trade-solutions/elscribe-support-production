"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import {
  SessionProvider,
  signOut as nextAuthSignOut,
  useSession,
} from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "./ui/sonner";
import { toast } from "sonner";

export type Role = "user" | "agent" | "admin";

export type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  accountType?: string;
  membershipRole?: string;
};

type AppContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  role: Role;
  signOut: () => Promise<void>;
  accountType: string | null;
  membershipRole: string | null;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapDbRoleToUiRole(dbRole: unknown): Role {
  if (dbRole === "admin") return "admin";
  if (dbRole === "agent") return "agent";
  return "user";
}

function AppContextInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("__flash_toast");
      if (!raw) return;
      sessionStorage.removeItem("__flash_toast");
      const data = JSON.parse(raw) as {
        type?: "success" | "error" | "message";
        title?: string;
        description?: string;
      };
      if (!data?.title) return;
      if (data.type === "error") {
        toast.error(data.title, { description: data.description });
      } else if (data.type === "message") {
        toast.message(data.title, { description: data.description });
      } else {
        toast.success(data.title, { description: data.description });
      }
    } catch {
      // ignore
    }
  }, []);

  const isAuthenticated = status === "authenticated";
  const sessionUser = (session?.user ?? {}) as Record<string, unknown>;
  const role = mapDbRoleToUiRole(sessionUser.role);
  const accountType = sessionUser.accountType
    ? String(sessionUser.accountType)
    : null;
  const membershipRole = sessionUser.membershipRole
    ? String(sessionUser.membershipRole)
    : null;

  const user: AppUser | null = isAuthenticated
    ? {
        id: String(sessionUser.id ?? ""),
        email: String(session?.user?.email ?? ""),
        name: session?.user?.name ?? null,
        role: sessionUser.role ? String(sessionUser.role) : undefined,
        accountType: accountType ?? undefined,
        membershipRole: membershipRole ?? undefined,
      }
    : null;

  const value = useMemo<AppContextType>(
    () => ({
      user,
      isAuthenticated,
      role,
      accountType,
      membershipRole,
      signOut: async () => {
        await nextAuthSignOut({ callbackUrl: "/" });
      },
    }),
    [user, isAuthenticated, role, accountType, membershipRole],
  );

  return (
    <AppContext.Provider value={value}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppContextInner>{children}</AppContextInner>
    </SessionProvider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
