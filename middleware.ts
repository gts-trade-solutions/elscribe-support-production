import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_FILE = /\.(.*)$/;

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/signin")) return true;
  if (pathname.startsWith("/signup")) return true;
  if (pathname.startsWith("/pricing")) return true;
  if (pathname.startsWith("/handoff")) return true;
  if (pathname.startsWith("/invite")) return true;
  if (pathname.startsWith("/ticket-link")) return true;
  if (pathname.startsWith("/session-expired")) return true;
  if (pathname.startsWith("/convert-account")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/socket.io") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as any;

  // A wiped guest token (the Phase 3 jwt callback returns {} on guest
  // expiry) still decodes to a non-null object but with no uid. Any
  // protected-route hit without uid whose browser carries a NextAuth
  // session cookie is treated as an expired session and lands on the
  // dedicated page instead of generic sign-in.
  const hasSessionCookie =
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");

  if (!token?.uid) {
    const tokenIsStale = Boolean(token && hasSessionCookie);
    if (tokenIsStale) {
      const url = req.nextUrl.clone();
      url.pathname = "/session-expired";
      url.search = "";
      const res = NextResponse.redirect(url);
      // Clear the stale cookie so the user doesn't bounce through this
      // branch again on every subsequent request.
      res.cookies.set("next-auth.session-token", "", {
        path: "/",
        maxAge: 0,
      });
      res.cookies.set("__Secure-next-auth.session-token", "", {
        path: "/",
        maxAge: 0,
        secure: true,
      });
      return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search,
    );
    return NextResponse.redirect(url);
  }

  const role = (token as any).role as string | undefined;

  if (pathname.startsWith("/admin")) {
    if (role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/agent")) {
    if (role !== "agent" && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
