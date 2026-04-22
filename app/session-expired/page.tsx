import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, UserPlus } from "lucide-react";
import { AppLayout } from "../app-layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SessionExpiredPage() {
  return (
    <AppLayout>
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Your guest session has expired
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Guest sessions last 48 hours. You have two options to keep
                working on your ticket:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Sign in if you&apos;ve already created an account.</li>
                <li>
                  Ask your agent or admin to extend your access with a fresh
                  link.
                </li>
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild>
                  <Link href="/signin">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/convert-account">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create account
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
