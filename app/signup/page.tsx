"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AppLayout } from "@/app/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, UserPlus, Wrench } from "lucide-react";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

function normalizeCallbackUrl(raw: string | null): string | null {
  if (!raw) return null;

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

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Query-string prefill (used by /convert-account → /signup?prefillEmail=...)
    try {
      if (typeof window !== "undefined") {
        const qp = new URLSearchParams(window.location.search).get(
          "prefillEmail",
        );
        if (qp && !email) {
          setEmail(qp);
          return;
        }
      }
    } catch {
      // ignore
    }
    // sessionStorage prefill (used by the handoff flow)
    try {
      const raw = sessionStorage.getItem("elscribe_prefill_signup");
      if (!raw) return;
      sessionStorage.removeItem("elscribe_prefill_signup");
      const parsed = JSON.parse(raw);
      if (!email && parsed?.email) setEmail(String(parsed.email));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          res.status === 409
            ? "Email already registered"
            : json?.error?.formErrors?.[0] ||
              json?.error ||
              "Failed to sign up";
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      // Auto sign-in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setFlashToast({
          type: "success",
          title: "Account created",
          description: "Please sign in to continue.",
        });
        window.location.assign("/signin");
        return;
      }

      const callbackUrl = normalizeCallbackUrl(
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("callbackUrl")
          : null,
      );

      setFlashToast({ type: "success", title: "Account created!" });
      window.location.assign(callbackUrl ?? "/tickets");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
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
                Create your El Scribe account
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Sign up to access your support workspace
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    "Creating account..."
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Create account
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Already have an account?{" "}
                </span>
                <Link href="/signin" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
