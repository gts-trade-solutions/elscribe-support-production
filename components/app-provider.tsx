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
  isGuest: boolean;
  sessionExpiresAt: string | null;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapDbRoleToUiRole(dbRole: unknown): Role {
  if (dbRole === "admin") return "admin";
  if (dbRole === "agent") return "agent";
  return "user";
}

function AppContextInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // Post-payment hint takes priority over __flash_toast — both fire at most
  // once, and we only want to show one toast per page-load to avoid stacking.
  useEffect(() => {
    try {
      const welcome = sessionStorage.getItem("__convert_welcome_pending");
      const isGuest = Boolean((session?.user as any)?.isGuest);
      if (welcome === "1" && !isGuest) {
        sessionStorage.removeItem("__convert_welcome_pending");
        sessionStorage.removeItem("__flash_toast");
        sessionStorage.removeItem("__guest_postpay_hint");
        sessionStorage.removeItem("__guest_banner_dismissed");
        toast.success("Welcome to El Scribe", {
          description: "Your ticket and history are here.",
        });
        return;
      }

      const postpay = sessionStorage.getItem("__guest_postpay_hint");
      if (postpay === "1" && isGuest) {
        sessionStorage.removeItem("__guest_postpay_hint");
        sessionStorage.removeItem("__flash_toast");
        toast.message("Payment received", {
          description:
            "Your ticket is ready — a guest session keeps you signed in for 48 hours.",
          action: {
            label: "Create account",
            onClick: () => {
              window.location.assign("/convert-account");
            },
          },
        });
        return;
      }

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
  }, [session?.user]);

  const isAuthenticated = status === "authenticated";
  const sessionUser = (session?.user ?? {}) as Record<string, unknown>;
  const role = mapDbRoleToUiRole(sessionUser.role);
  const accountType = sessionUser.accountType
    ? String(sessionUser.accountType)
    : null;
  const membershipRole = sessionUser.membershipRole
    ? String(sessionUser.membershipRole)
    : null;
  const isGuest = Boolean(sessionUser.isGuest);
  const sessionExpiresAt = sessionUser.sessionExpiresAt
    ? String(sessionUser.sessionExpiresAt)
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
      isGuest,
      sessionExpiresAt,
      signOut: async () => {
        await nextAuthSignOut({ callbackUrl: "/" });
      },
    }),
    [
      user,
      isAuthenticated,
      role,
      accountType,
      membershipRole,
      isGuest,
      sessionExpiresAt,
    ],
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
