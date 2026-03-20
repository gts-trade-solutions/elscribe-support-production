"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import type { Role } from "@/components/app-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Building2,
  ClipboardList,
  CreditCard,
  Home,
  ListTodo,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Settings,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  Receipt,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (
    pathname: string,
    search: ReturnType<typeof useSearchParams>,
  ) => boolean;
}

interface ActionItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AppHeaderProps {
  role: Role;
  isAuthenticated: boolean;
  onSignOut: () => void | Promise<void>;
  accountType?: string | null;
  membershipRole?: string | null;
}

function isPathActive(
  pathname: string,
  search: ReturnType<typeof useSearchParams>,
  item: NavItem,
) {
  if (item.match) return item.match(pathname, search);
  return (
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href))
  );
}

function getRoleHomeHref(role: Role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "agent") return "/agent/queue?view=mine";
  return "/tickets";
}

export function AppHeader({
  role,
  isAuthenticated,
  onSignOut,
  accountType,
  membershipRole,
}: AppHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthFlowPage =
    pathname.startsWith("/signin") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/handoff") ||
    pathname.startsWith("/invite");

  const usePublicShell = !isAuthenticated || isAuthFlowPage;

  const { navItems, primaryAction, roleLabel, homeHref } = useMemo(() => {
    if (usePublicShell) {
      return {
        roleLabel: "Public",
        homeHref: "/",
        navItems: [
          { href: "/", label: "Home", icon: Home },
          { href: "/pricing", label: "Pricing", icon: CreditCard },
        ] as NavItem[],
        primaryAction: {
          href: "/signup",
          label: "Sign up",
          icon: UserPlus,
        } as ActionItem,
      };
    }

    if (role === "agent") {
      return {
        roleLabel: "Agent",
        homeHref: getRoleHomeHref(role),
        navItems: [
          {
            href: "/agent/queue?view=mine",
            label: "My tickets",
            icon: ClipboardList,
            match: (current, search) =>
              current.startsWith("/agent/console") ||
              (current.startsWith("/agent/queue") &&
                search.get("view") !== "queue"),
          },
          {
            href: "/agent/queue?view=queue",
            label: "Queue",
            icon: ListTodo,
            match: (current, search) =>
              current.startsWith("/agent/queue") &&
              search.get("view") === "queue",
          },
          {
            href: "/agent/settings",
            label: "Settings",
            icon: Settings,
          },
        ] as NavItem[],
        primaryAction: {
          href: "/agent/queue?view=queue",
          label: "Open queue",
          icon: ListTodo,
        } as ActionItem,
      };
    }

    if (role === "admin") {
      return {
        roleLabel: "Admin",
        homeHref: getRoleHomeHref(role),
        navItems: [
          {
            href: "/admin/dashboard",
            label: "Dashboard",
            icon: ShieldCheck,
          },
          {
            href: "/admin/tickets",
            label: "Tickets",
            icon: ClipboardList,
            match: (current) =>
              current.startsWith("/admin/tickets") ||
              current.startsWith("/agent/console"),
          },
          {
            href: "/admin/customers",
            label: "Customers",
            icon: Users,
          },
          {
            href: "/admin/agents",
            label: "Operators",
            icon: UserCog,
          },
          {
            href: "/admin/payments",
            label: "Payments",
            icon: Receipt,
          },
          {
            href: "/admin/agent-requests",
            label: "Agent Requests",
            icon: UserCog,
          },
          { href: "/settings", label: "Settings", icon: Settings },
        ] as NavItem[],
        primaryAction: {
          href: "/admin/tickets",
          label: "Manage tickets",
          icon: ClipboardList,
        } as ActionItem,
      };
    }

    const customerNav: NavItem[] = [
      { href: "/tickets", label: "Tickets", icon: MessageSquare },
      { href: "/tickets/new", label: "New ticket", icon: PlusCircle },
      { href: "/pricing", label: "Pricing", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ];

    if (accountType === "company" || membershipRole === "owner") {
      customerNav.splice(3, 0, {
        href: "/settings/company-users",
        label: "Company users",
        icon: Building2,
      });
    }

    return {
      roleLabel: membershipRole === "member" ? "Company member" : "Customer",
      homeHref: getRoleHomeHref(role),
      navItems: customerNav,
      primaryAction: {
        href: "/tickets/new",
        label: "Get support",
        icon: PlusCircle,
      } as ActionItem,
    };
  }, [usePublicShell, role, accountType, membershipRole]);

  const handleSignOut = async () => {
    setMobileOpen(false);
    await onSignOut();
  };

  const logoSrc =
    theme === "dark" ? "/elscribe-logo-dark.svg" : "/elscribe-logo-light.svg";

  const PrimaryIcon = primaryAction.icon;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={homeHref} className="flex items-center gap-3">
            {mounted ? (
              <Image
                src={logoSrc}
                alt="eLscribe"
                width={142}
                height={36}
                priority
              />
            ) : (
              <span className="text-lg font-semibold tracking-tight">
                eLscribe
              </span>
            )}
          </Link>

          {!usePublicShell ? (
            <Badge variant="outline" className="hidden lg:inline-flex">
              {roleLabel}
            </Badge>
          ) : null}
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(pathname, searchParams, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground ${
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href={primaryAction.href}>
            <Button size="sm" className="gap-2">
              <PrimaryIcon className="h-4 w-4" />
              {primaryAction.label}
            </Button>
          </Link>

          <ThemeToggle />

          {isAuthenticated && !usePublicShell ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Link href="/signin">
              <Button variant="ghost" size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[88%] sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>{roleLabel} navigation</SheetTitle>
                <SheetDescription>
                  Open the main routes for this eLscribe workspace.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6">
                <SheetClose asChild>
                  <Link href={primaryAction.href} className="block">
                    <Button className="w-full gap-2">
                      <PrimaryIcon className="h-4 w-4" />
                      {primaryAction.label}
                    </Button>
                  </Link>
                </SheetClose>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isPathActive(pathname, searchParams, item);

                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? "border-primary bg-primary/5 text-primary"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Workspace</span>
                  <Badge variant="outline">{roleLabel}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Language switching has been removed from the application so
                  the production UI stays consistent for all users.
                </div>
              </div>

              <div className="mt-6">
                {isAuthenticated && !usePublicShell ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                ) : (
                  <SheetClose asChild>
                    <Link href="/signin" className="block">
                      <Button className="w-full" variant="outline">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                      </Button>
                    </Link>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
