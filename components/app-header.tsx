'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RoleToggle, type Role } from './role-toggle';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';
import { Wrench, Home, BookOpen, CreditCard, LogIn, LogOut, type LucideIcon } from 'lucide-react';
import { useTranslation, type Locale } from '@/lib/i18n';

interface AppHeaderProps {
  role: Role;
  onRoleChange: (role: Role) => void;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  isAuthenticated: boolean;
  onSignOut: () => void;
}

export function AppHeader({ role, onRoleChange, locale, onLocaleChange, isAuthenticated, onSignOut }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation(locale);
  const isPublicPage = pathname === '/' || pathname.startsWith('/knowledge') || pathname.startsWith('/pricing') || pathname.startsWith('/signin');

  const publicLinks = [
    { href: '/', label: t.nav.home, icon: Home },
    { href: '/knowledge', label: t.nav.knowledge, icon: BookOpen },
    { href: '/pricing', label: t.nav.pricing, icon: CreditCard },
  ];

  const userLinks = [
    { href: '/help', label: t.nav.instantHelp },
    { href: '/tickets', label: t.nav.tickets },
    { href: '/health-monitoring', label: t.nav.healthMonitoring },
    { href: '/repair-pipeline', label: t.nav.repairPipeline },
    { href: '/settings', label: t.nav.settings },
  ];

  const agentLinks = [
    { href: '/agent/inbox', label: t.nav.inbox },
    { href: '/agent/queue', label: t.nav.queue },
    { href: '/agent/console', label: t.nav.console },
    { href: '/agent/analytics', label: t.nav.analytics },
  ];

  const adminLinks = [
    { href: '/admin/dashboard', label: t.nav.dashboard },
    { href: '/admin/policies', label: t.nav.policies },
    { href: '/admin/organization', label: t.nav.organization },
    { href: '/admin/integrations', label: t.nav.integrations },
  ];

  const getLinks = () => {
    if (!isAuthenticated) return publicLinks;
    switch (role) {
      case 'user':
        return userLinks;
      case 'agent':
        return agentLinks;
      case 'admin':
        return adminLinks;
      default:
        return [];
    }
  };

  const handleSignOut = () => {
    onSignOut();
    router.push('/');
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:top-4 focus:left-4 focus:rounded-md"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <Wrench className="h-6 w-6" />
            <span>FixMate</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {getLinks().map((link) => {
              const Icon: LucideIcon | null = 'icon' in link ? (link.icon as LucideIcon) : null;
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={pathname === link.href ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLocaleChange(locale === 'en' ? 'hi' : 'en')}
              aria-label={`Switch to ${locale === 'en' ? 'Hindi' : 'English'}`}
            >
              {locale.toUpperCase()}
            </Button>
          </div>

          {isAuthenticated && <RoleToggle currentRole={role} onRoleChange={onRoleChange} locale={locale} />}

          {!isAuthenticated && (
            <Link href="/signin">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                {t.nav.signIn}
              </Button>
            </Link>
          )}

          {isAuthenticated && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
