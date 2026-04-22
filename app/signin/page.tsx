"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { AppLayout } from "@/app/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Mail, Wrench, LogIn } from "lucide-react";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

function roleDefaultRoute(dbRole: unknown) {
  if (dbRole === "admin") return "/admin/dashboard";
  if (dbRole === "agent") return "/agent/queue";
  return "/tickets";
}

function normalizeCallbackUrl(raw: string | null): string | null {
  if (!raw) return null;

  // If next-auth passes an absolute URL, only allow same-origin.
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      if (
        typeof window !== "undefined" &&
        url.origin !== window.location.origin
      ) {
        return null;
      }
      raw = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  // Only allow internal navigations.
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/api")) return null;
  if (raw.startsWith("/signin") || raw.startsWith("/signup")) return null;

  return raw;
}

function setFlashToast(data: {
  type?: "success" | "error" | "message";
  title: string;
  description?: string;
}) {
  try {
    sessionStorage.setItem("__flash_toast", JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        toast.error("Invalid email or password");
        setIsLoading(false);
        return;
      }

      const session = await getSession();
      const dbRole = (session?.user as any)?.role;

      const callbackUrl = normalizeCallbackUrl(
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("callbackUrl")
          : null,
      );

      const target = callbackUrl ?? roleDefaultRoute(dbRole);

      // In production we do a full navigation for reliability; show toast after redirect.
      setFlashToast({ type: "success", title: "Welcome back!" });
      window.location.assign(target);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthClick = (provider: string) => {
    toast.message(`${provider} OAuth is not enabled yet (Credentials only).`);
  };

  return (
    <AppLayout>
      <div className="container flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Welcome to El Scribe
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Sign in to access your support workspace
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthClick("GitHub")}
                  type="button"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Continue with GitHub
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthClick("Google")}
                  type="button"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="#"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    "Signing in..."
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" /> Sign In
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Don&apos;t have an account?{" "}
                </span>
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
