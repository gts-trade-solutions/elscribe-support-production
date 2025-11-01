'use client';

import { useApp } from '@/components/app-provider';
import { AppHeader } from '@/components/app-header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, setRole, locale, setLocale, isAuthenticated, signOut } = useApp();

  return (
    <>
      <AppHeader
        role={role}
        onRoleChange={setRole}
        locale={locale}
        onLocaleChange={setLocale}
        isAuthenticated={isAuthenticated}
        onSignOut={signOut}
      />
      <main id="main-content" className="min-h-[calc(100vh-4rem)]">{children}</main>
    </>
  );
}
