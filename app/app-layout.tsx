"use client";

import { Suspense } from "react";
import { useApp } from "@/components/app-provider";
import { AppHeader } from "@/components/app-header";

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95">
      <div className="container flex h-16 items-center" />
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, isAuthenticated, signOut, accountType, membershipRole } =
    useApp();

  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <AppHeader
          role={role}
          isAuthenticated={isAuthenticated}
          onSignOut={signOut}
          accountType={accountType}
          membershipRole={membershipRole}
        />
      </Suspense>

      <main id="main-content" className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </>
  );
}
