export function normalizeAppBaseUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

export function getServerAppBaseUrl(fallbackUrl?: string) {
  const fromEnv =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";

  if (fromEnv) return normalizeAppBaseUrl(fromEnv);

  if (fallbackUrl) {
    try {
      return normalizeAppBaseUrl(new URL(fallbackUrl).origin);
    } catch {}
  }

  return "";
}

export function getClientAppBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || "";
  if (fromEnv) return normalizeAppBaseUrl(fromEnv);

  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeAppBaseUrl(window.location.origin);
  }

  return "";
}
